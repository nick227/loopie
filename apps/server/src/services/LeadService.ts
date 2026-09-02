import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { scheduleAutomationRuns } from '../lib/automationScheduling'
import { notifyLeadStageChanged } from '../lib/leadInbox'
import { OUTBOUND_TYPES } from '../lib/leadCard'
import { computeLeadInsights } from '../lib/leadInsights'

// A bounded, unpaginated "what needs attention today" set — same operational-list philosophy as
// DashboardService.home(), not a browsable collection. A business with more open leads than this
// has bigger problems than pagination; revisit only if that ever actually happens.
const QUEUE_CAP = 200

function toLeadDTO(lead: any) {
  return {
    id: lead.id,
    businessId: lead.businessId,
    contactId: lead.contactId,
    stage: lead.stage,
    owner: lead.owner,
    estimatedValue: lead.estimatedValue !== null ? Number(lead.estimatedValue) : null,
    sourceType: lead.sourceType,
    sourceMessageId: lead.sourceMessageId,
    sourceDeploymentId: lead.sourceDeploymentId,
    sourceAdRunId: lead.sourceAdRunId,
    sourceAdUnitId: lead.sourceAdUnitId,
    clickId: lead.clickId,
    landingSessionId: lead.landingSessionId,
    referringAffiliateId: lead.referringAffiliateId,
    openedAt: lead.openedAt.toISOString(),
    closedAt: lead.closedAt?.toISOString() ?? null,
    nextActionNote: lead.nextActionNote,
    nextActionAt: lead.nextActionAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
  }
}

export class LeadService {
  async list(
    businessId: string,
    opts: { cursor?: string; limit?: number; stage?: string; sourceType?: string },
  ) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.stage) AND.push({ stage: opts.stage })
    if (opts.sourceType) AND.push({ sourceType: opts.sourceType })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const leads = await db.lead.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = leads.length > limit
    const items = hasMore ? leads.slice(0, limit) : leads
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toLeadDTO), meta: { hasMore, nextCursor } }
  }

  async get(businessId: string, leadId: string) {
    return toLeadDTO(await this._find(businessId, leadId))
  }

  // The morning work queue: every open lead, enriched with the same contacted/last-touch
  // computation as the per-contact lead card, plus a computed `buckets` classification. Bucketed
  // client-side into tabs, not paginated — see QUEUE_CAP. Only the pipeline's open leads are
  // queue material; WON/LOST leads are done, not something to work.
  //
  // "Contacted" here is computed the same way as lib/leadCard.ts's currentLeadCard, but batched
  // across every open lead in one extra query instead of one query per lead — every open lead's
  // window is [openedAt, now) since none of them have a closedAt by definition, so a single
  // `occurredAt >= earliest openedAt on this page` fetch, correlated against each lead's own
  // openedAt in application code, is both correct and N+1-free.
  async queue(businessId: string) {
    const leads = await db.lead.findMany({
      where: { businessId, openSlot: 'OPEN' },
      include: {
        contact: { select: { id: true, name: true, avatarAsset: { select: { url: true } } } },
      },
      orderBy: [{ openedAt: 'asc' }],
      take: QUEUE_CAP,
    })
    if (leads.length === 0) return { data: [] }

    const contactIds = [...new Set(leads.map((lead) => lead.contactId))]
    const earliestOpenedAt = leads.reduce(
      (min, lead) => (lead.openedAt < min ? lead.openedAt : min),
      leads[0]!.openedAt,
    )
    const touches = await db.interaction.findMany({
      where: {
        businessId,
        contactId: { in: contactIds },
        type: { in: OUTBOUND_TYPES },
        occurredAt: { gte: earliestOpenedAt },
      },
      select: { contactId: true, occurredAt: true },
    })
    const touchesByContact = new Map<string, Date[]>()
    for (const touch of touches) {
      const bucket = touchesByContact.get(touch.contactId) ?? []
      bucket.push(touch.occurredAt)
      touchesByContact.set(touch.contactId, bucket)
    }

    const now = new Date()
    return {
      data: leads.map((lead) => {
        const contactTouches = (touchesByContact.get(lead.contactId) ?? []).filter(
          (occurredAt) => occurredAt >= lead.openedAt,
        )
        const lastTouchAt = contactTouches.length
          ? new Date(Math.max(...contactTouches.map((d) => d.getTime())))
          : null
        const contacted = lastTouchAt != null
        const overdue = !!lead.nextActionAt && lead.nextActionAt < now

        const buckets: string[] = []
        if (lead.stage === 'NEW') buckets.push('NEW')
        if (!contacted) buckets.push('NEVER_CONTACTED')
        if (lead.stage === 'ENGAGED') buckets.push('ENGAGED')
        if (overdue) buckets.push('OVERDUE')
        // "Needs follow-up" = has been reached, but nobody has decided what happens next — a
        // gap in the plan, distinct from OVERDUE (a plan exists but its date has passed).
        else if (contacted && !lead.nextActionAt) buckets.push('NEEDS_FOLLOW_UP')

        return {
          id: lead.id,
          contact: {
            id: lead.contact.id,
            name: lead.contact.name,
            avatarUrl: lead.contact.avatarAsset?.url ?? null,
          },
          stage: lead.stage,
          sourceType: lead.sourceType,
          openedAt: lead.openedAt.toISOString(),
          contacted,
          lastTouchAt: lastTouchAt?.toISOString() ?? null,
          nextActionNote: lead.nextActionNote,
          nextActionAt: lead.nextActionAt?.toISOString() ?? null,
          buckets,
        }
      }),
    }
  }

  // Management-facing analytics — time-to-first-contact, touches before ENGAGED/WON, channel
  // mix, overdue rate, stage conversion. See lib/leadInsights.ts for the full computation.
  async insights(businessId: string) {
    return computeLeadInsights(businessId)
  }

  // Won/Lost stops active follow-up and closes the lead (docs/07-sales-flow-spec.md). Sale
  // capture itself is a separate step — POST /sales, per the openapi.yaml updateLead description.
  async update(businessId: string, leadId: string, data: any) {
    const current = await this._find(businessId, leadId)
    const closesNow = (data.stage === 'WON' || data.stage === 'LOST') && !current.closedAt

    const stageChanged = data.stage !== undefined && data.stage !== current.stage

    // Atomic: a stage change must never commit without its STATUS_CHANGE interaction — that
    // interaction's id is the idempotency key scheduleAutomationRuns keys off, so losing it to a
    // partial write would silently drop the LEAD_STATUS_CHANGED trigger with no way to detect it
    // later (the lead would just look like it changed stage with no audit trail).
    const { lead, interaction } = await db.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: {
          ...(data.stage !== undefined ? { stage: data.stage } : {}),
          ...(data.owner !== undefined ? { owner: data.owner } : {}),
          ...(data.estimatedValue !== undefined ? { estimatedValue: data.estimatedValue } : {}),
          ...(data.nextActionNote !== undefined ? { nextActionNote: data.nextActionNote } : {}),
          ...(data.nextActionAt !== undefined
            ? { nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null }
            : {}),
          ...(closesNow ? { closedAt: new Date(), openSlot: null } : {}),
        },
      })
      const createdInteraction = stageChanged
        ? await tx.interaction.create({
            data: {
              businessId,
              contactId: current.contactId,
              type: 'STATUS_CHANGE',
              metadata: { stage: data.stage },
            },
          })
        : null
      return { lead: updated, interaction: createdInteraction }
    })

    if (interaction) {
      await scheduleAutomationRuns(db, {
        businessId,
        trigger: 'LEAD_STATUS_CHANGED',
        contactId: current.contactId,
        leadId: lead.id,
        triggerSourceId: interaction.id,
        triggerEventAt: interaction.occurredAt,
      })
    }

    if (stageChanged) {
      try {
        const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
        await ActivityProjectionService.project(
          lead.businessId,
          'Lead',
          lead.id,
          'projectStatusChange',
          lead,
          { id: current.contactId },
          current.stage,
        )
      } catch (err) {
        console.error('Failed to project lead status change', err)
      }
      await notifyLeadStageChanged(businessId, current.contactId, current.stage, lead.stage)
    }

    return toLeadDTO(lead)
  }

  private async _find(businessId: string, leadId: string) {
    const lead = await db.lead.findFirst({ where: { id: leadId, businessId } })
    if (!lead) throw { statusCode: 404, message: 'Lead not found' }
    return lead
  }
}
