// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listFinanceAccounts', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/finance/accounts' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /finance/accounts', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/finance/accounts',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listFinanceAccounts', 200, res.json())
  })
})

describe('listLedgerTransactions', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/finance/transactions' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /finance/transactions', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/finance/transactions',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listLedgerTransactions', 200, res.json())
  })
})

describe('getLedgerTransaction', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/finance/transactions/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /finance/transactions/{transactionId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/finance/transactions/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getLedgerTransaction', 200, res.json())
  })
})

describe('reverseLedgerTransaction', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/transactions/00000000-0000-0000-0000-000000000001/reverse' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/transactions/{transactionId}/reverse', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/transactions/00000000-0000-0000-0000-000000000001/reverse',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('reverseLedgerTransaction', 201, res.json())
  })
})

describe('recordClientFunding', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/funding' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/funding', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/funding',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('recordClientFunding', 201, res.json())
  })
})

describe('applyFinanceCredit', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/credits' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/credits', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/credits',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('applyFinanceCredit', 201, res.json())
  })
})

describe('issueFinanceRefund', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/refunds' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/refunds', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/refunds',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('issueFinanceRefund', 201, res.json())
  })
})

describe('recordAdSpend', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/ad-spend' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/ad-spend', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/ad-spend',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('recordAdSpend', 201, res.json())
  })
})

describe('settleAdSpend', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/ad-spend/00000000-0000-0000-0000-000000000001/settle' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/ad-spend/{adSpendId}/settle', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/ad-spend/00000000-0000-0000-0000-000000000001/settle',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('settleAdSpend', 201, res.json())
  })
})

describe('recordLoopieFee', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/fees' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/fees', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/fees',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('recordLoopieFee', 201, res.json())
  })
})

describe('createCommission', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/commissions' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/commissions', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/commissions',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createCommission', 201, res.json())
  })
})

describe('markCommissionPayable', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/commissions/00000000-0000-0000-0000-000000000001/payable' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/commissions/{commissionId}/payable', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/commissions/00000000-0000-0000-0000-000000000001/payable',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('markCommissionPayable', 200, res.json())
  })
})

describe('cancelCommission', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/commissions/00000000-0000-0000-0000-000000000001/cancel' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/commissions/{commissionId}/cancel', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/commissions/00000000-0000-0000-0000-000000000001/cancel',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('cancelCommission', 200, res.json())
  })
})

describe('createPayout', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/payouts' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/payouts', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/payouts',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createPayout', 201, res.json())
  })
})

describe('reconcileAdSpend', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/finance/reconciliations' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /finance/reconciliations', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/finance/reconciliations',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('reconcileAdSpend', 201, res.json())
  })
})
