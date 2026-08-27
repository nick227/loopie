import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

const FORMAT_LABEL: Record<string, string> = {
  DISPLAY_BANNER: 'Display banner',
  NATIVE: 'Native',
  EMBED: 'Embed',
}

type FollowUpStatus = 'NONE' | 'SCHEDULED' | 'DUE' | 'SENT' | 'STOPPED'

function followUpForContact(runs: { status: string; runAt: Date }[]): {
  status: FollowUpStatus
  at: Date | null
} {
  const pending = runs
    .filter((run) => run.status === 'PENDING')
    .sort((a, b) => a.runAt.getTime() - b.runAt.getTime())[0]
  if (pending) {
    return {
      status: pending.runAt.getTime() <= Date.now() ? 'DUE' : 'SCHEDULED',
      at: pending.runAt,
    }
  }
  const last = [...runs].sort((a, b) => b.runAt.getTime() - a.runAt.getTime())[0]
  if (!last) return { status: 'NONE', at: null }
  if (last.status === 'EXECUTED') return { status: 'SENT', at: last.runAt }
  return { status: 'STOPPED', at: last.runAt }
}

export async function listCampaignLeadOutcomes(
  businessId: string,
  campaignId: string,
  opts: { cursor?: string; limit?: number },
) {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, businessId } })
  if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }

  const limit = normalizeLimit(opts.limit)
  const cursor = decodeCursor(opts.cursor)
  const AND: object[] = []
  if (cursor) {
    AND.push({
      OR: [
        { createdAt: { lt: new Date(cursor.createdAt) } },
        { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
      ],
    })
  }

  const leads = await db.lead.findMany({
    where: {
      businessId,
      OR: [
        { sourceDeployment: { campaignId } },
        { sourceAdUnit: { campaignId } },
        // AdRun's campaign association is via the optional CampaignAdRun join, not a direct
        // campaignId field — see CLAUDE.md's Media/Advertisement/AdRun migration audit.
        { sourceAdRun: { campaignLinks: { some: { campaignId } } } },
      ],
      ...(AND.length ? { AND } : {}),
    },
    include: {
      contact: { select: { id: true, name: true } },
      sales: { select: { amount: true } },
      sourceDeployment: { select: { platform: true, creative: { select: { name: true } } } },
      sourceAdRun: { select: { platform: true, advertisement: { select: { name: true } } } },
      sourceAdUnit: { select: { format: true, creative: { select: { name: true } } } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = leads.length > limit
  const items = hasMore ? leads.slice(0, limit) : leads
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
  const contactIds = items.map((lead) => lead.contactId)

  const [interactions, runs] = contactIds.length
    ? await Promise.all([
        db.interaction.findMany({
          where: { businessId, contactId: { in: contactIds } },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        }),
        db.automationRun.findMany({
          where: { contactId: { in: contactIds }, automation: { businessId } },
        }),
      ])
    : [[], []]

  const lastInteraction = new Map<string, { type: string; occurredAt: Date }>()
  for (const interaction of interactions) {
    if (!lastInteraction.has(interaction.contactId)) {
      lastInteraction.set(interaction.contactId, {
        type: interaction.type,
        occurredAt: interaction.occurredAt,
      })
    }
  }
  const runsByContact = new Map<string, { status: string; runAt: Date }[]>()
  for (const run of runs) {
    const list = runsByContact.get(run.contactId) ?? []
    list.push({ status: run.status, runAt: run.runAt })
    runsByContact.set(run.contactId, list)
  }

  return {
    data: items.map((lead) => {
      const saleTotal = lead.sales.reduce((sum, sale) => sum + Number(sale.amount), 0)
      const estimated = lead.estimatedValue !== null ? Number(lead.estimatedValue) : null
      const attributedValue = saleTotal > 0 ? saleTotal : estimated
      const isAdUnit = Boolean(lead.sourceAdUnitId)
      const isAdRun = Boolean(lead.sourceAdRunId)
      const creativeName = isAdUnit
        ? (lead.sourceAdUnit?.creative.name ?? null)
        : isAdRun
          ? (lead.sourceAdRun?.advertisement.name ?? null)
          : (lead.sourceDeployment?.creative.name ?? null)
      const platform = isAdUnit
        ? 'LOOPIE'
        : isAdRun
          ? (lead.sourceAdRun?.platform ?? null)
          : (lead.sourceDeployment?.platform ?? null)
      const sourceLabel = isAdUnit
        ? `${creativeName ?? 'Creative'} · ${FORMAT_LABEL[lead.sourceAdUnit?.format ?? ''] ?? 'Ad unit'}`
        : `${creativeName ?? 'Creative'} · ${platform}`
      const interaction = lastInteraction.get(lead.contactId)
      const followUp = followUpForContact(runsByContact.get(lead.contactId) ?? [])
      return {
        id: lead.id,
        contactId: lead.contactId,
        contactName: lead.contact.name,
        acquiredAt: lead.createdAt.toISOString(),
        stage: lead.stage,
        sourceType: isAdUnit ? 'AD_UNIT' : isAdRun ? 'AD_RUN' : 'DEPLOYMENT',
        platform,
        creativeName,
        sourceLabel,
        attributedValue,
        lastInteractionType: interaction?.type ?? null,
        lastInteractionAt: interaction?.occurredAt.toISOString() ?? null,
        followUpStatus: followUp.status,
        followUpAt: followUp.at?.toISOString() ?? null,
      }
    }),
    meta: { hasMore, nextCursor },
  }
}
