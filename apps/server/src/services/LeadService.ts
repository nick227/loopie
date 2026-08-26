import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

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
    sourceAdUnitId: lead.sourceAdUnitId,
    clickId: lead.clickId,
    landingSessionId: lead.landingSessionId,
    openedAt: lead.openedAt.toISOString(),
    closedAt: lead.closedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
  }
}

export class LeadService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; stage?: string; sourceType?: string }) {
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
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toLeadDTO), meta: { hasMore, nextCursor } }
  }

  async get(businessId: string, leadId: string) {
    return toLeadDTO(await this._find(businessId, leadId))
  }

  // Won/Lost stops active follow-up and closes the lead (docs/07-sales-flow-spec.md). Sale
  // capture itself is a separate step — POST /sales, per the openapi.yaml updateLead description.
  async update(businessId: string, leadId: string, data: any) {
    const current = await this._find(businessId, leadId)
    const closesNow = (data.stage === 'WON' || data.stage === 'LOST') && !current.closedAt

    const lead = await db.lead.update({
      where: { id: leadId },
      data: {
        ...(data.stage !== undefined ? { stage: data.stage } : {}),
        ...(data.owner !== undefined ? { owner: data.owner } : {}),
        ...(data.estimatedValue !== undefined ? { estimatedValue: data.estimatedValue } : {}),
        ...(closesNow ? { closedAt: new Date(), openSlot: null } : {}),
      },
    })

    if (data.stage !== undefined && data.stage !== current.stage) {
      await db.interaction.create({
        data: { businessId, contactId: current.contactId, type: 'STATUS_CHANGE', metadata: { stage: data.stage } },
      })
    }

    return toLeadDTO(lead)
  }

  private async _find(businessId: string, leadId: string) {
    const lead = await db.lead.findFirst({ where: { id: leadId, businessId } })
    if (!lead) throw { statusCode: 404, message: 'Lead not found' }
    return lead
  }
}
