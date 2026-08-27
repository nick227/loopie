import {
  applyCredit,
  issueRefund,
  recordClientFunding,
  reverseTransaction,
} from './finance/fundingOps'
import { recordServicePayment, refundServicePayment } from './finance/servicePaymentOps'
import {
  createCommission,
  cancelCommission,
  createPayout,
  markCommissionPayable,
  reverseCommission,
} from './finance/payoutOps'
import {
  attachPayoutTransferRef,
  createConnectPayout,
  failConnectPayout,
  findInFlightPayout,
  recordPayoutPaid,
  recordPayoutTransferred,
} from './finance/connectPayoutOps'
import {
  getAdRunFunding,
  getCampaignFunding,
  getTransaction,
  listAccounts,
  listTransactions,
  reconcileAdSpend,
} from './finance/queryOps'
import {
  authorizeAdRunBudget,
  authorizeCampaignBudget,
  recordAdRunSpend,
  recordAdSpend,
  recordLoopieFee,
  settleAdSpend,
} from './finance/spendOps'

export class FinanceService {
  listAccounts = listAccounts
  listTransactions = listTransactions
  getTransaction = getTransaction
  getCampaignFunding = getCampaignFunding
  getAdRunFunding = getAdRunFunding
  recordClientFunding = recordClientFunding
  recordServicePayment = recordServicePayment
  refundServicePayment = refundServicePayment
  applyCredit = applyCredit
  issueRefund = issueRefund
  reverseTransaction = reverseTransaction
  authorizeCampaignBudget = authorizeCampaignBudget
  authorizeAdRunBudget = authorizeAdRunBudget
  recordAdSpend = recordAdSpend
  recordAdRunSpend = recordAdRunSpend
  settleAdSpend = settleAdSpend
  recordLoopieFee = recordLoopieFee
  createCommission = createCommission
  markCommissionPayable = markCommissionPayable
  cancelCommission = cancelCommission
  reverseCommission = reverseCommission
  createPayout = createPayout
  createConnectPayout = createConnectPayout
  attachPayoutTransferRef = attachPayoutTransferRef
  recordPayoutTransferred = recordPayoutTransferred
  recordPayoutPaid = recordPayoutPaid
  failConnectPayout = failConnectPayout
  findInFlightPayout = findInFlightPayout
  reconcileAdSpend = reconcileAdSpend
}
