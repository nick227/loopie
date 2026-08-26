import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toSaleDTO(sale: any) {
  return {
    id: sale.id,
    businessId: sale.businessId,
    contactId: sale.contactId,
    leadId: sale.leadId,
    amount: Number(sale.amount),
    date: sale.date.toISOString(),
    productOrService: sale.productOrService,
    sourceType: sale.sourceType,
    sourceMessageId: sale.sourceMessageId,
        sourceDeploymentId: sale.sourceDeploymentId,
        sourceAdUnitId: sale.sourceAdUnitId,
        notes: sale.notes,
    createdAt: sale.createdAt.toISOString(),
  }
}

export class SaleService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const sales = await db.sale.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = sales.length > limit
    const items = hasMore ? sales.slice(0, limit) : sales
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toSaleDTO), meta: { hasMore, nextCursor } }
  }

  // Contact lifecycle becomes CUSTOMER (derived, not stored) and the linked Lead moves to WON —
  // docs/07-sales-flow-spec.md "When marked Won". Attribution follows the linked Lead's source
  // when known, otherwise the sale is MANUAL.
  async create(businessId: string, data: any) {
    const contact = await db.contact.findFirst({ where: { id: data.contactId, businessId, deletedAt: null } })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }

    return db.$transaction(async (tx) => {
      let lead = null
      if (data.leadId) {
        lead = await tx.lead.findFirst({ where: { id: data.leadId, businessId } })
        if (!lead) throw { statusCode: 404, message: 'Lead not found' }
      }

      const sourceType = lead ? lead.sourceType : 'MANUAL'
      const sourceMessageId = lead?.sourceMessageId ?? null
      const sourceDeploymentId = lead?.sourceDeploymentId ?? null
      const sourceAdUnitId = lead?.sourceAdUnitId ?? null

      const sale = await tx.sale.create({
        data: {
          businessId,
          contactId: data.contactId,
          leadId: data.leadId,
          amount: data.amount,
          date: new Date(data.date),
          productOrService: data.productOrService,
          sourceType,
          sourceMessageId,
          sourceDeploymentId,
          sourceAdUnitId,
          notes: data.notes,
        },
      })

      if (lead && lead.stage !== 'WON') {
        await tx.lead.update({
          where: { id: lead.id },
          data: { stage: 'WON', closedAt: new Date(), openSlot: null },
        })
      }

      await tx.contact.update({ where: { id: data.contactId }, data: { lastContactedAt: new Date() } })
      await tx.interaction.create({
        data: {
          businessId,
          contactId: data.contactId,
          type: 'SALE_RECORDED',
          sourceType,
          sourceMessageId,
          sourceDeploymentId,
          sourceAdUnitId,
          metadata: { amount: data.amount },
        },
      })

      return toSaleDTO(sale)
    })
  }

  async get(businessId: string, saleId: string) {
    const sale = await db.sale.findFirst({ where: { id: saleId, businessId } })
    if (!sale) throw { statusCode: 404, message: 'Sale not found' }
    return toSaleDTO(sale)
  }
}
