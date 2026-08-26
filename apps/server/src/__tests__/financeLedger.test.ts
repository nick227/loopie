import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId, testOtherBusinessId } from './helpers'
import { FinanceService } from '../services/FinanceService'
import { ensureChartOfAccounts } from '../lib/finance/accounts'
import { postLedger, transactionBalance } from '../lib/finance/ledger'

const app = buildTestApp()
const finance = new FinanceService()

async function createCampaign() {
  const creative = await db.creative.create({
    data: { businessId: testBusinessId, name: 'Ledger creative' },
  })
  return db.campaign.create({
    data: {
      businessId: testBusinessId,
      name: 'Ledger campaign',
      budget: 800,
      startDate: new Date(),
      platforms: ['META'],
      creativeLinks: { create: [{ creativeId: creative.id }] },
    },
  })
}

function balances(rows: { kind: string; balanceMinor: number }[]) {
  return Object.fromEntries(rows.map((row) => [row.kind, row.balanceMinor]))
}

describe('money & ledger MVP', () => {
  it('posts the funding → authorize → spend → fee → credit → payout sequence on the ledger', async () => {
    const campaign = await createCampaign()

    const fundRes = await app.inject({
      method: 'POST',
      url: '/finance/funding',
      headers: asAuth(testUserId),
      payload: { amountMinor: 100000, currency: 'USD', idempotencyKey: 'fund-1000', externalRef: 'pi_1000' },
    })
    expect(fundRes.statusCode).toBe(201)

    const authRes = await app.inject({
      method: 'POST',
      url: `/campaigns/${campaign.id}/budget-authorizations`,
      headers: asAuth(testUserId),
      payload: { amountMinor: 80000, currency: 'USD', idempotencyKey: 'auth-800' },
    })
    expect(authRes.statusCode).toBe(201)

    const spendRes = await app.inject({
      method: 'POST',
      url: '/finance/ad-spend',
      headers: asAuth(testUserId),
      payload: {
        campaignId: campaign.id,
        amountMinor: 12537,
        currency: 'USD',
        platform: 'META',
        externalChargeId: 'meta_chg_12537',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-07T00:00:00.000Z',
        idempotencyKey: 'spend-12537',
      },
    })
    expect(spendRes.statusCode).toBe(201)
    const adSpendId = spendRes.json().data.id

    const reconcileRes = await app.inject({
      method: 'POST',
      url: '/finance/reconciliations',
      headers: asAuth(testUserId),
      payload: {
        adSpendId,
        trackedAmountMinor: 12537,
        platformReportedAmountMinor: 12537,
        settledAmountMinor: 12537,
        idempotencyKey: 'recon-12537',
      },
    })
    expect(reconcileRes.statusCode).toBe(201)
    expect(reconcileRes.json().data.status).toBe('MATCHED')
    expect(spendRes.json().data.reportedAmountMinor).toBe(12537)

    const settleRes = await app.inject({
      method: 'POST',
      url: `/finance/ad-spend/${adSpendId}/settle`,
      headers: asAuth(testUserId),
      payload: { settledAmountMinor: 12537, idempotencyKey: 'settle-12537' },
    })
    expect(settleRes.statusCode).toBe(201)
    expect(settleRes.json().data.reportedAmountMinor).toBe(12537)
    expect(settleRes.json().data.settledAmountMinor).toBe(12537)

    const feeRes = await app.inject({
      method: 'POST',
      url: '/finance/fees',
      headers: asAuth(testUserId),
      payload: { amountMinor: 1500, currency: 'USD', idempotencyKey: 'fee-15', description: 'management fee' },
    })
    expect(feeRes.statusCode).toBe(201)

    const creditRes = await app.inject({
      method: 'POST',
      url: '/finance/credits',
      headers: asAuth(testUserId),
      payload: { amountMinor: 2500, currency: 'USD', idempotencyKey: 'credit-25', reason: 'courtesy credit' },
    })
    expect(creditRes.statusCode).toBe(201)

    const commissionRes = await app.inject({
      method: 'POST',
      url: '/finance/commissions',
      headers: asAuth(testUserId),
      payload: { amountMinor: 4000, currency: 'USD', payeeRef: 'affiliate-1', idempotencyKey: 'comm-40' },
    })
    expect(commissionRes.statusCode).toBe(201)
    expect(commissionRes.json().data.status).toBe('PENDING')
    const commissionId = commissionRes.json().data.id

    const payableRes = await app.inject({
      method: 'POST',
      url: `/finance/commissions/${commissionId}/payable`,
      headers: asAuth(testUserId),
      payload: { idempotencyKey: 'comm-40-payable' },
    })
    expect(payableRes.statusCode).toBe(200)
    expect(payableRes.json().data.status).toBe('PAYABLE')

    const payoutRes = await app.inject({
      method: 'POST',
      url: '/finance/payouts',
      headers: asAuth(testUserId),
      payload: { commissionIds: [commissionId], payeeRef: 'affiliate-1', idempotencyKey: 'payout-40' },
    })
    expect(payoutRes.statusCode).toBe(201)

    const txRes = await app.inject({
      method: 'GET',
      url: '/finance/transactions?limit=50',
      headers: asAuth(testUserId),
    })
    expect(txRes.statusCode).toBe(200)
    for (const tx of txRes.json().data) {
      expect(transactionBalance(tx.entries)).toBe(0)
    }

    const accountsRes = await app.inject({
      method: 'GET',
      url: '/finance/accounts?currency=USD',
      headers: asAuth(testUserId),
    })
    const fromApi = balances(accountsRes.json().data)
    const entries = await db.ledgerEntry.findMany({ where: { businessId: testBusinessId } })
    const accounts = await db.financialAccount.findMany({ where: { businessId: testBusinessId } })
    const reconstructed: Record<string, number> = {}
    for (const account of accounts) {
      const debit = entries
        .filter((row) => row.accountId === account.id && row.direction === 'DEBIT')
        .reduce((sum, row) => sum + row.amountMinor, 0)
      const credit = entries
        .filter((row) => row.accountId === account.id && row.direction === 'CREDIT')
        .reduce((sum, row) => sum + row.amountMinor, 0)
      reconstructed[account.kind] = account.kind === 'LOOPIE_CASH' || account.kind === 'PROCESSOR_CLEARING' || account.kind === 'REFUNDS_CREDITS'
        ? debit - credit
        : credit - debit
    }
    expect(fromApi).toEqual(reconstructed)
    expect(fromApi.CLIENT_AD_FUNDS).toBe(21000)
    expect(fromApi.CLIENT_FUNDS_RESERVED).toBe(67463)
    expect(fromApi.LOOPIE_CASH).toBe(83463)
    expect(fromApi.AD_PLATFORM_CLEARING).toBe(0)
    expect(fromApi.AFFILIATE_PAYABLE).toBe(0)
    expect(fromApi.LOOPIE_REVENUE).toBe(-2500)
    expect(fromApi.REFUNDS_CREDITS).toBe(2500)

    const fundingRes = await app.inject({
      method: 'GET',
      url: `/campaigns/${campaign.id}/funding`,
      headers: asAuth(testUserId),
    })
    expect(fundingRes.statusCode).toBe(200)
    const funding = fundingRes.json().data
    expect(funding.planningBudget).toBe(800)
    expect(funding.authorizedAmountMinor).toBe(80000)
    expect(funding.reservedAmountMinor).toBe(67463)
    expect(funding.platformReportedAmountMinor).toBe(12537)
    expect(funding.settledAmountMinor).toBe(12537)
    expect(funding.clientAvailableAmountMinor).toBe(21000)
  })

  it('rejects duplicate idempotency keys without double-crediting', async () => {
    const first = await finance.recordClientFunding(testBusinessId, {
      amountMinor: 100000,
      currency: 'USD',
      idempotencyKey: 'dup-fund',
    })
    const second = await finance.recordClientFunding(testBusinessId, {
      amountMinor: 100000,
      currency: 'USD',
      idempotencyKey: 'dup-fund',
    })
    expect(second.id).toBe(first.id)
    const accounts = await finance.listAccounts(testBusinessId, 'USD')
    expect(balances(accounts.data).CLIENT_AD_FUNDS).toBe(100000)
    expect(await db.payment.count({ where: { businessId: testBusinessId } })).toBe(1)
  })

  it('isolates ledger data by tenant', async () => {
    await finance.recordClientFunding(testBusinessId, {
      amountMinor: 50000,
      currency: 'USD',
      idempotencyKey: 'alice-fund',
    })
    const aliceTxs = await finance.listTransactions(testBusinessId, { limit: 20 })
    const aliceTx = aliceTxs.data[0]
    if (!aliceTx) throw new Error('expected a posted funding transaction')
    const aliceTxId = aliceTx.id

    const bobAccounts = await app.inject({
      method: 'GET',
      url: '/finance/accounts?currency=USD',
      headers: asAuth(testOtherUserId),
    })
    expect(balances(bobAccounts.json().data).CLIENT_AD_FUNDS).toBe(0)

    const bobGet = await app.inject({
      method: 'GET',
      url: `/finance/transactions/${aliceTxId}`,
      headers: asAuth(testOtherUserId),
    })
    expect(bobGet.statusCode).toBe(404)

    await expect(
      finance.reverseTransaction(testOtherBusinessId, { transactionId: aliceTxId, idempotencyKey: 'bob-reverse' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects unbalanced postings before any rows are written', async () => {
    const beforeTx = await db.ledgerTransaction.count()
    const beforeEntry = await db.ledgerEntry.count()
    await expect(
      db.$transaction(async (tx) => {
        const chart = await ensureChartOfAccounts(tx, testBusinessId, 'USD')
        await postLedger(tx, {
          businessId: testBusinessId,
          currency: 'USD',
          type: 'ADJUSTMENT',
          idempotencyKey: 'unbalanced',
          entries: [
            { accountId: chart.LOOPIE_CASH.id, direction: 'DEBIT', amountMinor: 100 },
            { accountId: chart.CLIENT_AD_FUNDS.id, direction: 'CREDIT', amountMinor: 50 },
          ],
        })
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Unbalanced') })
    expect(await db.ledgerTransaction.count()).toBe(beforeTx)
    expect(await db.ledgerEntry.count()).toBe(beforeEntry)
  })

  it('rolls back the whole ledger write if any entry fails', async () => {
    const beforeTx = await db.ledgerTransaction.count()
    const beforeEntry = await db.ledgerEntry.count()
    await expect(
      db.$transaction(async (tx) => {
        const chart = await ensureChartOfAccounts(tx, testBusinessId, 'USD')
        await postLedger(tx, {
          businessId: testBusinessId,
          currency: 'USD',
          type: 'ADJUSTMENT',
          idempotencyKey: 'partial-fail',
          entries: [
            { accountId: chart.LOOPIE_CASH.id, direction: 'DEBIT', amountMinor: 100 },
            { accountId: 'missing-account', direction: 'CREDIT', amountMinor: 100 },
          ],
        })
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(await db.ledgerTransaction.count()).toBe(beforeTx)
    expect(await db.ledgerEntry.count()).toBe(beforeEntry)
  })

  it('keeps original posted entries when reversing', async () => {
    const payment = await finance.recordClientFunding(testBusinessId, {
      amountMinor: 2500,
      currency: 'USD',
      idempotencyKey: 'rev-fund',
    })
    const original = await db.ledgerTransaction.findFirstOrThrow({
      where: { id: payment.ledgerTransactionId },
      include: { entries: true },
    })
    const reversal = await finance.reverseTransaction(testBusinessId, {
      transactionId: original.id,
      idempotencyKey: 'rev-1',
    })
    const still = await db.ledgerEntry.findMany({ where: { transactionId: original.id } })
    expect(still).toHaveLength(original.entries.length)
    expect(still.map((row) => row.amountMinor)).toEqual(original.entries.map((row) => row.amountMinor))
    expect(transactionBalance(reversal.entries)).toBe(0)
    expect(reversal.reversesTransactionId).toBe(original.id)
  })
})
