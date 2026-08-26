import { db } from '@project/db'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { toAdSpendDTO, toBudgetAuthorizationDTO } from '../../lib/finance/dtoEntities'
import { toTransactionDTO } from '../../lib/finance/dto'
import { accountBalanceMinor, balancedPair, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireMoney } from '../../lib/finance/money'
import type { AuthorizeBudgetInput, FeeInput, RecordAdSpendInput, SettleAdSpendInput } from '../../lib/finance/types'

export async function authorizeCampaignBudget(businessId: string, campaignId: string, input: AuthorizeBudgetInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.budgetAuthorization.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (existing) return toBudgetAuthorizationDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({ where: { id: campaignId, businessId } })
      if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
      const active = await tx.budgetAuthorization.findFirst({
        where: { campaignId, businessId, status: 'ACTIVE' },
      })
      if (active) throw { statusCode: 409, message: 'Campaign already has an active budget authorization' }
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const available = await accountBalanceMinor(tx, businessId, chart.CLIENT_AD_FUNDS.id)
      if (available < amountMinor) throw { statusCode: 409, message: 'Insufficient client ad funds to authorize' }
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'BUDGET_RESERVE',
        idempotencyKey,
        metadata: input.metadata,
        campaignId,
        entries: balancedPair(chart.CLIENT_AD_FUNDS.id, chart.CLIENT_FUNDS_RESERVED.id, amountMinor),
      })
      const auth = await tx.budgetAuthorization.create({
        data: {
          businessId,
          campaignId,
          currency,
          authorizedAmountMinor: amountMinor,
          idempotencyKey,
          ledgerTransactionId: posted.id,
        },
      })
      return toBudgetAuthorizationDTO(auth)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.budgetAuthorization.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      })
      return row ? toBudgetAuthorizationDTO(row) : null
    })
  }
}

export async function recordAdSpend(businessId: string, input: RecordAdSpendInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.adSpend.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (existing) return toAdSpendDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({ where: { id: input.campaignId, businessId } })
      if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
      if (input.deploymentId) {
        const deployment = await tx.deployment.findFirst({
          where: { id: input.deploymentId, campaignId: input.campaignId },
        })
        if (!deployment) throw { statusCode: 404, message: 'Deployment not found' }
      }
      if (input.adUnitId) {
        const adUnit = await tx.adUnit.findFirst({
          where: { id: input.adUnitId, campaignId: input.campaignId, businessId },
        })
        if (!adUnit) throw { statusCode: 404, message: 'Ad unit not found' }
      }
      const authorization = await tx.budgetAuthorization.findFirst({
        where: { campaignId: input.campaignId, businessId, status: 'ACTIVE' },
      })
      if (!authorization) throw { statusCode: 409, message: 'No active budget authorization for this campaign' }
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const reserved = await accountBalanceMinor(tx, businessId, chart.CLIENT_FUNDS_RESERVED.id, input.campaignId)
      if (reserved < amountMinor) throw { statusCode: 409, message: 'Insufficient reserved campaign funds' }
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'AD_SPEND',
        idempotencyKey,
        externalRef: input.externalChargeId,
        metadata: input.metadata,
        campaignId: input.campaignId,
        entries: balancedPair(chart.CLIENT_FUNDS_RESERVED.id, chart.AD_PLATFORM_CLEARING.id, amountMinor),
      })
      const spend = await tx.adSpend.create({
        data: {
          businessId,
          campaignId: input.campaignId,
          budgetAuthorizationId: authorization.id,
          deploymentId: input.deploymentId,
          adUnitId: input.adUnitId,
          platform: input.platform,
          externalChargeId: input.externalChargeId,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          currency,
          reportedAmountMinor: amountMinor,
          idempotencyKey,
          ledgerTransactionId: posted.id,
        },
      })
      return toAdSpendDTO(spend)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.adSpend.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      })
      return row ? toAdSpendDTO(row) : null
    })
  }
}

export async function settleAdSpend(businessId: string, adSpendId: string, input: SettleAdSpendInput) {
  const existing = await db.adSpend.findFirst({
    where: { businessId, settlementTransaction: { idempotencyKey: input.idempotencyKey } },
  })
  if (existing) return toAdSpendDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const spend = await tx.adSpend.findFirst({ where: { id: adSpendId, businessId } })
      if (!spend) throw { statusCode: 404, message: 'Ad spend not found' }
      if (spend.settlementTransactionId) throw { statusCode: 409, message: 'Ad spend already settled' }
      if (!Number.isInteger(input.settledAmountMinor) || input.settledAmountMinor <= 0) {
        throw { statusCode: 400, message: 'settledAmountMinor must be a positive integer' }
      }
      const chart = await ensureChartOfAccounts(tx, businessId, spend.currency)
      const reported = spend.reportedAmountMinor
      const settled = input.settledAmountMinor
      const entries = [
        { accountId: chart.AD_PLATFORM_CLEARING.id, direction: 'DEBIT' as const, amountMinor: reported },
        { accountId: chart.LOOPIE_CASH.id, direction: 'CREDIT' as const, amountMinor: settled },
      ]
      if (reported !== settled) {
        entries.push({
          accountId: chart.CLIENT_FUNDS_RESERVED.id,
          direction: reported > settled ? 'CREDIT' : 'DEBIT',
          amountMinor: Math.abs(reported - settled),
        })
      }
      const posted = await postLedger(tx, {
        businessId,
        currency: spend.currency,
        type: 'AD_SPEND_SETTLEMENT',
        idempotencyKey: input.idempotencyKey,
        campaignId: spend.campaignId,
        entries,
      })
      const updated = await tx.adSpend.update({
        where: { id: spend.id },
        data: {
          settledAmountMinor: input.settledAmountMinor,
          settlementStatus: 'SETTLED',
          settlementTransactionId: posted.id,
        },
      })
      return toAdSpendDTO(updated)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.adSpend.findFirst({
        where: { businessId, settlementTransaction: { idempotencyKey: input.idempotencyKey } },
      })
      return row ? toAdSpendDTO(row) : null
    })
  }
}

export async function recordLoopieFee(businessId: string, input: FeeInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.ledgerTransaction.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    include: { entries: true },
  })
  if (existing) return toTransactionDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      if (input.campaignId) {
        const campaign = await tx.campaign.findFirst({ where: { id: input.campaignId, businessId } })
        if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
      }
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const source = input.campaignId ? chart.CLIENT_FUNDS_RESERVED : chart.CLIENT_AD_FUNDS
      const available = await accountBalanceMinor(tx, businessId, source.id, input.campaignId)
      if (available < amountMinor) throw { statusCode: 409, message: 'Insufficient funds for LOOPIE fee' }
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'LOOPIE_FEE',
        idempotencyKey,
        metadata: { description: input.description ?? null, ...input.metadata },
        campaignId: input.campaignId,
        entries: balancedPair(source.id, chart.LOOPIE_REVENUE.id, amountMinor),
      })
      return toTransactionDTO(posted)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.ledgerTransaction.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
        include: { entries: true },
      })
      return row ? toTransactionDTO(row) : null
    })
  }
}
