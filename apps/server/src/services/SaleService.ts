import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { scheduleAutomationRuns } from '../lib/automationScheduling'
import {
  computeSaleSplit,
  dealPolicyFromRow,
  isWithinEligibilityWindow,
  resolveDealPolicy,
} from '../lib/affiliateRates'
import { requireIdempotencyKey } from '../lib/finance/money'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'
import { FinanceService } from './FinanceService'

const financeService = new FinanceService()

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
    sourceAdRunId: sale.sourceAdRunId,
    sourceAdUnitId: sale.sourceAdUnitId,
    notes: sale.notes,
    reversedAt: sale.reversedAt?.toISOString() ?? null,
    idempotencyKey: sale.idempotencyKey ?? null,
    createdAt: sale.createdAt.toISOString(),
  }
}

const affiliatePolicyInclude = { deal: true, class: { include: { defaultDeal: true } } } as const

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
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toSaleDTO), meta: { hasMore, nextCursor } }
  }

  // "Where did this contact's revenue come from" — the full sale history for one contact, plus a
  // summary that deliberately uses the exact same ACTIVE_SALE_WHERE predicate Contact.revenue
  // itself is computed from (ContactService.get/list), so the two numbers always reconcile. A
  // reversed sale still appears in `data` (its own reversedAt makes that visible) but is excluded
  // from the summary, matching how revenue already treats it — never silently hidden, never
  // double-counted.
  async listForContact(
    businessId: string,
    contactId: string,
    opts: { cursor?: string; limit?: number },
  ) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, businessId, deletedAt: null },
      select: { id: true },
    })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }

    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      // Cursor stores `sale.date` (the real transaction date, this history's chronological
      // key) in the shared `createdAt` cursor field — same reuse ContactService.listInteractions
      // already does for `occurredAt`, rather than adding a second cursor payload shape.
      AND.push({
        OR: [
          { date: { lt: new Date(cursor.createdAt) } },
          { date: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }

    const [sales, summaryAgg] = await Promise.all([
      db.sale.findMany({
        where: { contactId, businessId, ...(AND.length ? { AND } : {}) },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      db.sale.aggregate({
        where: { contactId, businessId, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
        _count: { _all: true },
        _max: { date: true },
      }),
    ])

    const hasMore = sales.length > limit
    const items = hasMore ? sales.slice(0, limit) : sales
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.date.toISOString(), id: last.id }) : null

    const leadIds = [
      ...new Set(items.map((sale) => sale.leadId).filter((id): id is string => !!id)),
    ]
    const leads = leadIds.length
      ? await db.lead.findMany({
          where: { id: { in: leadIds }, businessId },
          select: { id: true, stage: true },
        })
      : []
    const leadById = new Map(leads.map((lead) => [lead.id, lead]))

    return {
      data: items.map((sale) => ({
        ...toSaleDTO(sale),
        lead: sale.leadId ? (leadById.get(sale.leadId) ?? null) : null,
      })),
      summary: {
        totalRevenue: Number(summaryAgg._sum.amount ?? 0),
        saleCount: summaryAgg._count._all,
        lastSaleDate: summaryAgg._max.date?.toISOString() ?? null,
      },
      meta: { hasMore, nextCursor },
    }
  }

  // Contact lifecycle becomes CUSTOMER (derived, not stored) and the linked Lead moves to WON —
  // docs/07-sales-flow-spec.md "When marked Won". Attribution follows the linked Lead's source
  // when known, otherwise the sale is MANUAL.
  //
  // Idempotent on (businessId, idempotencyKey) — same convention as every finance-writing
  // endpoint (see apps/server/src/services/finance/fundingOps.ts). A retried request or a
  // double-submitted form must return the original Sale, not record the economic event twice
  // (found live: the pre-idempotency version double-recorded revenue on retry AND double-paid
  // affiliate commission, since the commission's own idempotencyKey was derived from the
  // duplicate Sale's freshly-minted id rather than a stable identity).
  async create(businessId: string, data: any) {
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey)
    const existing = await db.sale.findUnique({
      where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    })
    if (existing) return toSaleDTO(existing)

    const contact = await db.contact.findFirst({
      where: { id: data.contactId, businessId, deletedAt: null },
    })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }

    let result
    try {
      result = await db.$transaction(async (tx) => {
        let lead = null
        if (data.leadId) {
          lead = await tx.lead.findFirst({ where: { id: data.leadId, businessId } })
          if (!lead) throw { statusCode: 404, message: 'Lead not found' }
          if (lead.contactId !== data.contactId) {
            throw { statusCode: 400, message: 'Lead does not belong to this contact' }
          }
          // Repeat-purchase policy (explicit, per user decision): a sale credits the lead/
          // opportunity it belongs to. Reusing an already-closed Lead for a second sale would
          // silently keep crediting whatever campaign originally acquired it, years later if
          // need be — campaign-attributed revenue and customer-lifetime revenue must not blend.
          // A repeat purchase must attach to a new Lead (fresh acquisition touch, or one created
          // by hand) to be measured as a new conversion; passing no leadId at all still works —
          // it's just recorded as a standalone MANUAL sale with no campaign attribution.
          if (lead.closedAt) {
            throw {
              statusCode: 409,
              message:
                'This lead is already closed — record a new Lead for a repeat purchase, or omit leadId for a standalone sale.',
            }
          }
        }

        const sourceType = lead ? lead.sourceType : 'MANUAL'
        const sourceMessageId = lead?.sourceMessageId ?? null
        const sourceDeploymentId = lead?.sourceDeploymentId ?? null
        const sourceAdRunId = lead?.sourceAdRunId ?? null
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
            sourceAdRunId,
            sourceAdUnitId,
            notes: data.notes,
            idempotencyKey,
          },
        })

        if (lead && lead.stage !== 'WON') {
          await tx.lead.update({
            where: { id: lead.id },
            data: { stage: 'WON', closedAt: new Date(), openSlot: null },
          })
        }

        await tx.contact.update({
          where: { id: data.contactId },
          data: { lastContactedAt: new Date() },
        })
        await tx.interaction.create({
          data: {
            businessId,
            contactId: data.contactId,
            type: 'SALE_RECORDED',
            sourceType,
            sourceMessageId,
            sourceDeploymentId,
            sourceAdRunId,
            sourceAdUnitId,
            metadata: { amount: data.amount },
          },
        })

        const affiliate = lead?.referringAffiliateId
          ? await tx.affiliate.findUnique({
              where: { id: lead.referringAffiliateId },
              include: affiliatePolicyInclude,
            })
          : null

        return { sale, leadId: lead?.id ?? null, affiliate, lead }
      })
    } catch (err) {
      // A concurrent duplicate request can race past the findUnique fast-path above; the unique
      // constraint on (businessId, idempotencyKey) is the real guarantee. MySQL surfaces this
      // race as either a clean P2002 unique-violation or a P2034 "write conflict/deadlock,
      // please retry" depending on timing — found live, not by inspection: a concurrent-request
      // test reproduced the P2034 case, which a P2002-only check misses entirely. Rather than
      // enumerate every Prisma conflict code, just check whether the row actually exists: if it
      // does, a concurrent request won the race and this replays its result; if it doesn't, the
      // failure was real (e.g. "Lead not found") and must propagate. A short bounded retry
      // handles the remaining timing window where this transaction's own failure is reported
      // before the "winning" concurrent transaction has actually committed yet — found live via
      // a flaky concurrent-request test, not by inspection.
      for (let attempt = 0; attempt < 5; attempt++) {
        const row = await db.sale.findUnique({
          where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
        })
        if (row) return toSaleDTO(row)
        if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 10))
      }
      throw err
    }

    // Scheduled outside the transaction — idempotent (see scheduleAutomationRuns), doesn't need
    // to be atomic with the sale write. Only reached when this call actually created the Sale
    // (a replayed duplicate returns early above), so these side effects never run twice for one
    // economic event.
    const triggerEventAt = new Date()
    await scheduleAutomationRuns(db, {
      businessId,
      trigger: 'SALE_RECORDED',
      contactId: data.contactId,
      leadId: result.leadId,
      triggerSourceId: result.sale.id,
      triggerEventAt,
    })

    // Affiliate commission — same post-commit, best-effort convention as the automation
    // scheduling above (not atomic with the sale write; FinanceService.createCommission is
    // idempotent via idempotencyKey, so a retried request can't double-commission). All money
    // owed flows through FinanceService — there is no affiliate-balance field anywhere; an
    // affiliate's earnings are just Commission rows filtered by payeeRef.
    if (result.affiliate) {
      await this._freezeAndCommission(
        businessId,
        data.contactId,
        result.sale,
        result.lead,
        result.affiliate,
      )
    }

    try {
      const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
      await ActivityProjectionService.project(
        result.sale.businessId,
        'Sale',
        result.sale.id,
        'project',
        result.sale,
        contact,
      )
    } catch (projErr) {
      console.error('Failed to project sale recorded', projErr)
    }

    return toSaleDTO(result.sale)
  }

  async get(businessId: string, saleId: string) {
    const sale = await db.sale.findFirst({ where: { id: saleId, businessId } })
    if (!sale) throw { statusCode: 404, message: 'Sale not found' }
    return toSaleDTO(sale)
  }

  // The one place a sale can be undone — no Sale.status enum, just a nullable timestamp
  // (matches Lead.closedAt/Automation.pausedAt). Reopens the linked Lead's stage only if this
  // was its only active sale (a lead can have more than one), and deliberately does not touch
  // openSlot — that's the one-open-lead-per-contact concurrency guard for new submissions, not
  // something a retroactive stage change should re-contest. Reverses the linked Commission (if
  // any) through FinanceService.reverseCommission — never mutated directly, per "all money owed/
  // paid flows through FinanceService."
  //
  // Concurrency-safe by construction: the "already reversed?" check is a conditional
  // `updateMany({ where: { reversedAt: null } })` inside the transaction, not a read-then-write
  // check beforehand. Two concurrent reverse calls for the same sale both race to that single
  // atomic UPDATE — exactly one sees rowCount 1 and proceeds to reverse the linked commissions,
  // the other sees rowCount 0 and returns the already-reversed sale untouched. Previously this
  // relied entirely on FinanceService's own idempotencyKey dedup underneath as accidental
  // protection, not on this function's own guard actually providing mutual exclusion.
  async reverse(businessId: string, saleId: string, data: { reason?: string }) {
    const sale = await db.sale.findFirst({ where: { id: saleId, businessId } })
    if (!sale) throw { statusCode: 404, message: 'Sale not found' }

    const { performedReversal } = await db.$transaction(async (tx) => {
      const updated = await tx.sale.updateMany({
        where: { id: sale.id, businessId, reversedAt: null },
        data: { reversedAt: new Date() },
      })
      if (updated.count === 0) return { performedReversal: false }

      if (sale.leadId) {
        const otherActiveSales = await tx.sale.count({
          where: { leadId: sale.leadId, reversedAt: null, id: { not: sale.id } },
        })
        if (otherActiveSales === 0) {
          await tx.lead.update({
            where: { id: sale.leadId },
            data: { stage: 'QUALIFIED', closedAt: null },
          })
        }
      }
      return { performedReversal: true }
    })

    if (performedReversal) {
      const commissions = await db.commission.findMany({
        where: { businessId, sourceRef: sale.id },
      })
      for (const commission of commissions) {
        await financeService.reverseCommission(
          businessId,
          commission.id,
          `reverse-commission:${sale.id}:${commission.id}`,
          data.reason ?? 'Sale reversed',
        )
      }

      try {
        const reversedSale = await db.sale.findUniqueOrThrow({ where: { id: sale.id } })
        const contact = await db.contact.findUniqueOrThrow({ where: { id: sale.contactId } })
        const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
        await ActivityProjectionService.project(
          reversedSale.businessId,
          'Sale',
          reversedSale.id,
          'project',
          reversedSale,
          contact,
        )
      } catch (projErr) {
        console.error('Failed to project sale reversed', projErr)
      }
    }

    return toSaleDTO(await db.sale.findUniqueOrThrow({ where: { id: sale.id } }))
  }

  private async _freezeAndCommission(
    businessId: string,
    contactId: string,
    sale: { id: string; amount: unknown; createdAt: Date },
    lead: { landingSessionId: string | null; openedAt: Date } | null,
    affiliate: {
      id: string
      managerId: string | null
      affiliateRateOverrideBps: number | null
      managerShareOverrideBps: number | null
      deal: Parameters<typeof dealPolicyFromRow>[0] | null
      class: { defaultDeal: Parameters<typeof dealPolicyFromRow>[0] | null } | null
    },
  ) {
    const policy = resolveDealPolicy({
      assignedDeal: affiliate.deal ? dealPolicyFromRow(affiliate.deal) : null,
      classDefaultDeal: affiliate.class?.defaultDeal
        ? dealPolicyFromRow(affiliate.class.defaultDeal)
        : null,
      overrideRateBps: affiliate.affiliateRateOverrideBps,
      overrideManagerShareBps: affiliate.managerShareOverrideBps,
    })

    const click = lead?.landingSessionId
      ? await db.affiliateReferralClick.findFirst({
          where: { affiliateId: affiliate.id, sessionId: lead.landingSessionId },
          orderBy: { clickedAt: 'desc' },
        })
      : null

    if (policy.eligibilityWindowDays != null && !click) {
      await db.interaction.create({
        data: {
          businessId,
          contactId,
          type: 'NOTE',
          metadata: {
            affiliateId: affiliate.id,
            note: 'Sale has no referral click to measure eligibility from — no commission created.',
          },
        },
      })
      return
    }

    const referredAt = click?.clickedAt ?? sale.createdAt
    const window = isWithinEligibilityWindow({
      eligibilityWindowDays: policy.eligibilityWindowDays,
      referredAt,
      soldAt: sale.createdAt,
    })
    if (!window.ok) {
      await db.interaction.create({
        data: {
          businessId,
          contactId,
          type: 'NOTE',
          metadata: {
            affiliateId: affiliate.id,
            note: `Sale is outside this affiliate's ${policy.eligibilityWindowDays}-day eligibility window (referred ${Math.floor(window.daysSinceReferral)} days ago) — no commission created.`,
          },
        },
      })
      return
    }

    const managerAffiliateId = affiliate.managerId
    const split = computeSaleSplit({
      saleAmount: Number(sale.amount),
      policy,
      managerAffiliateId,
    })
    if (split.grossCommissionMinor <= 0) return

    await db.saleAffiliateSplit.create({
      data: {
        saleId: sale.id,
        referringAffiliateId: affiliate.id,
        managerAffiliateId,
        commissionRuleType: policy.commissionRuleType,
        grossAffiliateRateBps: split.grossAffiliateRateBps,
        fixedAmountMinor: policy.fixedAmountMinor,
        managerShareBps: split.managerShareBps,
        affiliateNetBps: split.affiliateNetBps,
        eligibilityWindowDays: policy.eligibilityWindowDays,
        saleAmountMinor: split.saleAmountMinor,
        grossCommissionMinor: split.grossCommissionMinor,
        managerCommissionMinor: split.managerCommissionMinor,
        affiliateCommissionMinor: split.affiliateCommissionMinor,
      },
    })

    if (split.affiliateCommissionMinor > 0) {
      await financeService.createCommission(businessId, {
        amountMinor: split.affiliateCommissionMinor,
        currency: 'USD',
        payeeRef: `affiliate:${affiliate.id}`,
        sourceRef: sale.id,
        idempotencyKey: `commission:sale:${sale.id}:affiliate:${affiliate.id}`,
      })
    }
    if (managerAffiliateId && split.managerCommissionMinor > 0) {
      await financeService.createCommission(businessId, {
        amountMinor: split.managerCommissionMinor,
        currency: 'USD',
        payeeRef: `affiliate:${managerAffiliateId}`,
        sourceRef: sale.id,
        idempotencyKey: `commission:sale:${sale.id}:manager:${managerAffiliateId}`,
      })
    }
  }
}
