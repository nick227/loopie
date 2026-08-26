// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('finance API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listFinanceAccounts
    
    // listFinanceAccounts - auth check
    try {
      if (!'/finance/accounts'.includes('{') || createdIds['finance']) {
        const reslistFinanceAccountsAuth = await app.inject({ method: 'GET', url: `/finance/accounts` })
        expect(reslistFinanceAccountsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listFinanceAccounts auth failed: ' + e.message))
    }

    try {
      if (!'/finance/accounts'.includes('{') || createdIds['finance']) {
        const reslistFinanceAccounts = await app.inject({
          method: 'GET',
          url: `/finance/accounts`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistFinanceAccounts.statusCode !== 200) {
          console.error('listFinanceAccounts failed with ' + reslistFinanceAccounts.statusCode, reslistFinanceAccounts.json().message || reslistFinanceAccounts.json())
        }
        expect(reslistFinanceAccounts.statusCode).toBe(200)
        await validateResponse('listFinanceAccounts', 200, reslistFinanceAccounts.json())
      }
    } catch (e: any) {
      errors.push(new Error('listFinanceAccounts failed: ' + e.message))
    }

    // listLedgerTransactions
    
    // listLedgerTransactions - auth check
    try {
      if (!'/finance/transactions'.includes('{') || createdIds['finance']) {
        const reslistLedgerTransactionsAuth = await app.inject({ method: 'GET', url: `/finance/transactions` })
        expect(reslistLedgerTransactionsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listLedgerTransactions auth failed: ' + e.message))
    }

    try {
      if (!'/finance/transactions'.includes('{') || createdIds['finance']) {
        const reslistLedgerTransactions = await app.inject({
          method: 'GET',
          url: `/finance/transactions`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistLedgerTransactions.statusCode !== 200) {
          console.error('listLedgerTransactions failed with ' + reslistLedgerTransactions.statusCode, reslistLedgerTransactions.json().message || reslistLedgerTransactions.json())
        }
        expect(reslistLedgerTransactions.statusCode).toBe(200)
        await validateResponse('listLedgerTransactions', 200, reslistLedgerTransactions.json())
      }
    } catch (e: any) {
      errors.push(new Error('listLedgerTransactions failed: ' + e.message))
    }

    // getLedgerTransaction
    
    // getLedgerTransaction - auth check
    try {
      if (!'/finance/transactions/{transactionId}'.includes('{') || createdIds['finance']) {
        const resgetLedgerTransactionAuth = await app.inject({ method: 'GET', url: `/finance/transactions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetLedgerTransactionAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getLedgerTransaction auth failed: ' + e.message))
    }

    try {
      if (!'/finance/transactions/{transactionId}'.includes('{') || createdIds['finance']) {
        const resgetLedgerTransaction = await app.inject({
          method: 'GET',
          url: `/finance/transactions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetLedgerTransaction.statusCode !== 200) {
          console.error('getLedgerTransaction failed with ' + resgetLedgerTransaction.statusCode, resgetLedgerTransaction.json().message || resgetLedgerTransaction.json())
        }
        expect(resgetLedgerTransaction.statusCode).toBe(200)
        await validateResponse('getLedgerTransaction', 200, resgetLedgerTransaction.json())
      }
    } catch (e: any) {
      errors.push(new Error('getLedgerTransaction failed: ' + e.message))
    }

    // reverseLedgerTransaction
    
    // reverseLedgerTransaction - auth check
    try {
      if (!'/finance/transactions/{transactionId}/reverse'.includes('{') || createdIds['finance']) {
        const resreverseLedgerTransactionAuth = await app.inject({ method: 'POST', url: `/finance/transactions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/reverse` })
        expect(resreverseLedgerTransactionAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('reverseLedgerTransaction auth failed: ' + e.message))
    }

    try {
      if (!'/finance/transactions/{transactionId}/reverse'.includes('{') || createdIds['finance']) {
        const resreverseLedgerTransaction = await app.inject({
          method: 'POST',
          url: `/finance/transactions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/reverse`,
          headers: asAuth(testUserId),
          payload: {
  "idempotencyKey": "test_string"
},
        })
        if (resreverseLedgerTransaction.statusCode === 201 && resreverseLedgerTransaction.json().data?.id) createdIds['finance'] = resreverseLedgerTransaction.json().data.id
        if (resreverseLedgerTransaction.statusCode !== 201) {
          console.error('reverseLedgerTransaction failed with ' + resreverseLedgerTransaction.statusCode, resreverseLedgerTransaction.json().message || resreverseLedgerTransaction.json())
        }
        expect(resreverseLedgerTransaction.statusCode).toBe(201)
        await validateResponse('reverseLedgerTransaction', 201, resreverseLedgerTransaction.json())
      }
    } catch (e: any) {
      errors.push(new Error('reverseLedgerTransaction failed: ' + e.message))
    }

    // recordClientFunding
    
    // recordClientFunding - auth check
    try {
      if (!'/finance/funding'.includes('{') || createdIds['finance']) {
        const resrecordClientFundingAuth = await app.inject({ method: 'POST', url: `/finance/funding` })
        expect(resrecordClientFundingAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('recordClientFunding auth failed: ' + e.message))
    }

    try {
      if (!'/finance/funding'.includes('{') || createdIds['finance']) {
        const resrecordClientFunding = await app.inject({
          method: 'POST',
          url: `/finance/funding`,
          headers: asAuth(testUserId),
          payload: {
  "amountMinor": 1,
  "currency": "tes",
  "idempotencyKey": "test_string"
},
        })
        if (resrecordClientFunding.statusCode === 201 && resrecordClientFunding.json().data?.id) createdIds['finance'] = resrecordClientFunding.json().data.id
        if (resrecordClientFunding.statusCode !== 201) {
          console.error('recordClientFunding failed with ' + resrecordClientFunding.statusCode, resrecordClientFunding.json().message || resrecordClientFunding.json())
        }
        expect(resrecordClientFunding.statusCode).toBe(201)
        await validateResponse('recordClientFunding', 201, resrecordClientFunding.json())
      }
    } catch (e: any) {
      errors.push(new Error('recordClientFunding failed: ' + e.message))
    }

    // applyFinanceCredit
    
    // applyFinanceCredit - auth check
    try {
      if (!'/finance/credits'.includes('{') || createdIds['finance']) {
        const resapplyFinanceCreditAuth = await app.inject({ method: 'POST', url: `/finance/credits` })
        expect(resapplyFinanceCreditAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('applyFinanceCredit auth failed: ' + e.message))
    }

    try {
      if (!'/finance/credits'.includes('{') || createdIds['finance']) {
        const resapplyFinanceCredit = await app.inject({
          method: 'POST',
          url: `/finance/credits`,
          headers: asAuth(testUserId),
          payload: {
  "amountMinor": 1,
  "currency": "tes",
  "idempotencyKey": "test_string"
},
        })
        if (resapplyFinanceCredit.statusCode === 201 && resapplyFinanceCredit.json().data?.id) createdIds['finance'] = resapplyFinanceCredit.json().data.id
        if (resapplyFinanceCredit.statusCode !== 201) {
          console.error('applyFinanceCredit failed with ' + resapplyFinanceCredit.statusCode, resapplyFinanceCredit.json().message || resapplyFinanceCredit.json())
        }
        expect(resapplyFinanceCredit.statusCode).toBe(201)
        await validateResponse('applyFinanceCredit', 201, resapplyFinanceCredit.json())
      }
    } catch (e: any) {
      errors.push(new Error('applyFinanceCredit failed: ' + e.message))
    }
    // Skipped issueFinanceRefund because payload could not be generated
    // Skipped recordAdSpend because payload could not be generated

    // settleAdSpend
    
    // settleAdSpend - auth check
    try {
      if (!'/finance/ad-spend/{adSpendId}/settle'.includes('{') || createdIds['finance']) {
        const ressettleAdSpendAuth = await app.inject({ method: 'POST', url: `/finance/ad-spend/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/settle` })
        expect(ressettleAdSpendAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('settleAdSpend auth failed: ' + e.message))
    }

    try {
      if (!'/finance/ad-spend/{adSpendId}/settle'.includes('{') || createdIds['finance']) {
        const ressettleAdSpend = await app.inject({
          method: 'POST',
          url: `/finance/ad-spend/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/settle`,
          headers: asAuth(testUserId),
          payload: {
  "settledAmountMinor": 1,
  "idempotencyKey": "test_string"
},
        })
        if (ressettleAdSpend.statusCode === 201 && ressettleAdSpend.json().data?.id) createdIds['finance'] = ressettleAdSpend.json().data.id
        if (ressettleAdSpend.statusCode !== 201) {
          console.error('settleAdSpend failed with ' + ressettleAdSpend.statusCode, ressettleAdSpend.json().message || ressettleAdSpend.json())
        }
        expect(ressettleAdSpend.statusCode).toBe(201)
        await validateResponse('settleAdSpend', 201, ressettleAdSpend.json())
      }
    } catch (e: any) {
      errors.push(new Error('settleAdSpend failed: ' + e.message))
    }
    // Skipped recordLoopieFee because payload could not be generated

    // createCommission
    
    // createCommission - auth check
    try {
      if (!'/finance/commissions'.includes('{') || createdIds['finance']) {
        const rescreateCommissionAuth = await app.inject({ method: 'POST', url: `/finance/commissions` })
        expect(rescreateCommissionAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createCommission auth failed: ' + e.message))
    }

    try {
      if (!'/finance/commissions'.includes('{') || createdIds['finance']) {
        const rescreateCommission = await app.inject({
          method: 'POST',
          url: `/finance/commissions`,
          headers: asAuth(testUserId),
          payload: {
  "amountMinor": 1,
  "currency": "tes",
  "payeeRef": "test_string",
  "idempotencyKey": "test_string"
},
        })
        if (rescreateCommission.statusCode === 201 && rescreateCommission.json().data?.id) createdIds['finance'] = rescreateCommission.json().data.id
        if (rescreateCommission.statusCode !== 201) {
          console.error('createCommission failed with ' + rescreateCommission.statusCode, rescreateCommission.json().message || rescreateCommission.json())
        }
        expect(rescreateCommission.statusCode).toBe(201)
        await validateResponse('createCommission', 201, rescreateCommission.json())
      }
    } catch (e: any) {
      errors.push(new Error('createCommission failed: ' + e.message))
    }

    // markCommissionPayable
    
    // markCommissionPayable - auth check
    try {
      if (!'/finance/commissions/{commissionId}/payable'.includes('{') || createdIds['finance']) {
        const resmarkCommissionPayableAuth = await app.inject({ method: 'POST', url: `/finance/commissions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/payable` })
        expect(resmarkCommissionPayableAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('markCommissionPayable auth failed: ' + e.message))
    }

    try {
      if (!'/finance/commissions/{commissionId}/payable'.includes('{') || createdIds['finance']) {
        const resmarkCommissionPayable = await app.inject({
          method: 'POST',
          url: `/finance/commissions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/payable`,
          headers: asAuth(testUserId),
          payload: {
  "idempotencyKey": "test_string"
},
        })
        if (resmarkCommissionPayable.statusCode === 201 && resmarkCommissionPayable.json().data?.id) createdIds['finance'] = resmarkCommissionPayable.json().data.id
        if (resmarkCommissionPayable.statusCode !== 200) {
          console.error('markCommissionPayable failed with ' + resmarkCommissionPayable.statusCode, resmarkCommissionPayable.json().message || resmarkCommissionPayable.json())
        }
        expect(resmarkCommissionPayable.statusCode).toBe(200)
        await validateResponse('markCommissionPayable', 200, resmarkCommissionPayable.json())
      }
    } catch (e: any) {
      errors.push(new Error('markCommissionPayable failed: ' + e.message))
    }

    // cancelCommission
    
    // cancelCommission - auth check
    try {
      if (!'/finance/commissions/{commissionId}/cancel'.includes('{') || createdIds['finance']) {
        const rescancelCommissionAuth = await app.inject({ method: 'POST', url: `/finance/commissions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/cancel` })
        expect(rescancelCommissionAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('cancelCommission auth failed: ' + e.message))
    }

    try {
      if (!'/finance/commissions/{commissionId}/cancel'.includes('{') || createdIds['finance']) {
        const rescancelCommission = await app.inject({
          method: 'POST',
          url: `/finance/commissions/${createdIds['finance'] || '00000000-0000-0000-0000-000000000001'}/cancel`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (rescancelCommission.statusCode === 201 && rescancelCommission.json().data?.id) createdIds['finance'] = rescancelCommission.json().data.id
        if (rescancelCommission.statusCode !== 200) {
          console.error('cancelCommission failed with ' + rescancelCommission.statusCode, rescancelCommission.json().message || rescancelCommission.json())
        }
        expect(rescancelCommission.statusCode).toBe(200)
        await validateResponse('cancelCommission', 200, rescancelCommission.json())
      }
    } catch (e: any) {
      errors.push(new Error('cancelCommission failed: ' + e.message))
    }
    // Skipped createPayout because payload could not be generated
    // Skipped reconcileAdSpend because payload could not be generated
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
