import { applyCredit, issueRefund, recordClientFunding, reverseTransaction } from './finance/fundingOps'
import { createCommission, cancelCommission, createPayout, markCommissionPayable, reverseCommission } from './finance/payoutOps'
import { getCampaignFunding, getTransaction, listAccounts, listTransactions, reconcileAdSpend } from './finance/queryOps'
import { authorizeCampaignBudget, recordAdSpend, recordLoopieFee, settleAdSpend } from './finance/spendOps'

export class FinanceService {
  listAccounts = listAccounts
  listTransactions = listTransactions
  getTransaction = getTransaction
  getCampaignFunding = getCampaignFunding
  recordClientFunding = recordClientFunding
  applyCredit = applyCredit
  issueRefund = issueRefund
  reverseTransaction = reverseTransaction
  authorizeCampaignBudget = authorizeCampaignBudget
  recordAdSpend = recordAdSpend
  settleAdSpend = settleAdSpend
  recordLoopieFee = recordLoopieFee
  createCommission = createCommission
  markCommissionPayable = markCommissionPayable
  cancelCommission = cancelCommission
  reverseCommission = reverseCommission
  createPayout = createPayout
  reconcileAdSpend = reconcileAdSpend
}
