import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { scheduleAutomationRuns } from '../lib/automationScheduling'
import {
  computeSaleSplit,
  dealPolicyFromRow,
  isWithinEligibilityWindow,
  resolveDealPolicy,
} from '../lib/affiliateRates'
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
        sourceAdUnitId: sale.sourceAdUnitId,
        notes: sale.notes,
    reversedAt: sale.reversedAt?.toISOString() ?? null,
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
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toSaleDTO), meta: { hasMore, nextCursor } }
  }

  // Contact lifecycle becomes CUSTOMER (derived, not stored) and the linked Lead moves to WON —
  // docs/07-sales-flow-spec.md "When marked Won". Attribution follows the linked Lead's source
  // when known, otherwise the sale is MANUAL.
  async create(businessId: string, data: any) {
    const contact = await db.contact.findFirst({ where: { id: data.contactId, businessId, deletedAt: null } })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }

    const result = await db.$transaction(async (tx) => {
      let lead = null
      if (data.leadId) {
        lead = await tx.lead.findFirst({ where: { id: data.leadId, businessId } })
        if (!lead) throw { statusCode: 404, message: 'Lead not found' }
        if (lead.contactId !== data.contactId) {
          throw { statusCode: 400, message: 'Lead does not belong to this contact' }
        }
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

      const affiliate = lead?.referringAffiliateId
        ? await tx.affiliate.findUnique({
            where: { id: lead.referringAffiliateId },
            include: affiliatePolicyInclude,
          })
        : null

      return { sale, leadId: lead?.id ?? null, affiliate, lead }
    })

    // Scheduled outside the transaction — idempotent (see scheduleAutomationRuns), doesn't need
    // to be atomic with the sale write.
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
      await this._freezeAndCommission(businessId, data.contactId, result.sale, result.lead, result.affiliate)
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
  async reverse(businessId: string, saleId: string, data: { reason?: string }) {
    const sale = await db.sale.findFirst({ where: { id: saleId, businessId } })
    if (!sale) throw { statusCode: 404, message: 'Sale not found' }
    if (sale.reversedAt) return toSaleDTO(sale)

    await db.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: sale.id }, data: { reversedAt: new Date() } })

      if (sale.leadId) {
        const otherActiveSales = await tx.sale.count({
          where: { leadId: sale.leadId, reversedAt: null, id: { not: sale.id } },
        })
        if (otherActiveSales === 0) {
          await tx.lead.update({ where: { id: sale.leadId }, data: { stage: 'QUALIFIED', closedAt: null } })
        }
      }
    })

    const commissions = await db.commission.findMany({ where: { businessId, sourceRef: sale.id } })
    for (const commission of commissions) {
      await financeService.reverseCommission(
        businessId,
        commission.id,
        `reverse-commission:${sale.id}:${commission.id}`,
        data.reason ?? 'Sale reversed',
      )
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
      classDefaultDeal: affiliate.class?.defaultDeal ? dealPolicyFromRow(affiliate.class.defaultDeal) : null,
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
            note: "Sale has no referral click to measure eligibility from — no commission created.",
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
