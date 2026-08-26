import { FinanceService } from '../services/FinanceService'
import { CampaignService } from '../services/CampaignService'
import { StripeConnectPayoutService } from '../services/StripeConnectPayoutService'

const financeService = new FinanceService()
const campaignService = new CampaignService()
const connectPayouts = new StripeConnectPayoutService()

export async function listFinanceAccounts(
  request: { user: { businessId: string }; query: { currency?: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await financeService.listAccounts(
    request.user.businessId,
    request.query.currency ?? 'USD',
  )
  return reply.send(data)
}

export async function listLedgerTransactions(
  request: { user: { businessId: string }; query: { cursor?: string; limit?: number } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await financeService.listTransactions(request.user.businessId, request.query)
  return reply.send(data)
}

export async function getLedgerTransaction(
  request: { user: { businessId: string }; params: { transactionId: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const tx = await financeService.getTransaction(
    request.user.businessId,
    request.params.transactionId,
  )
  return reply.send({ data: tx })
}

export async function reverseLedgerTransaction(
  request: {
    user: { businessId: string }
    params: { transactionId: string }
    body: { idempotencyKey: string; reason?: string }
  },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const tx = await financeService.reverseTransaction(request.user.businessId, {
    transactionId: request.params.transactionId,
    idempotencyKey: request.body.idempotencyKey,
    reason: request.body.reason,
  })
  return reply.status(201).send({ data: tx })
}

export async function recordClientFunding(
  request: {
    user: { businessId: string }
    body: Parameters<FinanceService['recordClientFunding']>[1]
  },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const payment = await financeService.recordClientFunding(request.user.businessId, request.body)
  return reply.status(201).send({ data: payment })
}

export async function applyFinanceCredit(
  request: { user: { businessId: string }; body: Parameters<FinanceService['applyCredit']>[1] },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const tx = await financeService.applyCredit(request.user.businessId, request.body)
  return reply.status(201).send({ data: tx })
}

export async function issueFinanceRefund(
  request: { user: { businessId: string }; body: Parameters<FinanceService['issueRefund']>[1] },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const refund = await financeService.issueRefund(request.user.businessId, request.body)
  return reply.status(201).send({ data: refund })
}

export async function recordAdSpend(
  request: { user: { businessId: string }; body: Parameters<FinanceService['recordAdSpend']>[1] },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const spend = await campaignService.recordAdSpend(request.user.businessId, request.body)
  return reply.status(201).send({ data: spend })
}

export async function settleAdSpend(
  request: {
    user: { businessId: string }
    params: { adSpendId: string }
    body: { settledAmountMinor: number; idempotencyKey: string }
  },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const spend = await financeService.settleAdSpend(
    request.user.businessId,
    request.params.adSpendId,
    request.body,
  )
  return reply.status(201).send({ data: spend })
}

export async function recordLoopieFee(
  request: { user: { businessId: string }; body: Parameters<FinanceService['recordLoopieFee']>[1] },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const tx = await financeService.recordLoopieFee(request.user.businessId, request.body)
  return reply.status(201).send({ data: tx })
}

export async function createCommission(
  request: {
    user: { businessId: string }
    body: Parameters<FinanceService['createCommission']>[1]
  },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const commission = await financeService.createCommission(request.user.businessId, request.body)
  return reply.status(201).send({ data: commission })
}

export async function markCommissionPayable(
  request: {
    user: { businessId: string }
    params: { commissionId: string }
    body: { idempotencyKey: string }
  },
  reply: { send: (body: unknown) => unknown },
) {
  const commission = await financeService.markCommissionPayable(
    request.user.businessId,
    request.params.commissionId,
    request.body.idempotencyKey,
  )
  return reply.send({ data: commission })
}

export async function cancelCommission(
  request: { user: { businessId: string }; params: { commissionId: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const commission = await financeService.cancelCommission(
    request.user.businessId,
    request.params.commissionId,
  )
  return reply.send({ data: commission })
}

export async function createPayout(
  request: { user: { businessId: string }; body: Parameters<FinanceService['createPayout']>[1] },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const payout = await connectPayouts.payOrManual(request.user.businessId, request.body)
  return reply.status(201).send({ data: payout })
}

export async function reconcileAdSpend(
  request: {
    user: { businessId: string }
    body: Parameters<FinanceService['reconcileAdSpend']>[1]
  },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const row = await financeService.reconcileAdSpend(request.user.businessId, request.body)
  return reply.status(201).send({ data: row })
}
