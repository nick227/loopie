import { db } from '@project/db'
import { getStripe, stripeConfigured } from '../lib/stripe'
import { FinanceService } from './FinanceService'
import type { CreatePayoutInput } from '../lib/finance/types'

const finance = new FinanceService()

function affiliateIdFromPayee(payeeRef: string) {
  return payeeRef.startsWith('affiliate:') ? payeeRef.slice('affiliate:'.length) : null
}

export class StripeConnectPayoutService {
  async payOrManual(businessId: string, input: CreatePayoutInput) {
    const affiliateId = affiliateIdFromPayee(input.payeeRef)
    if (!affiliateId) return finance.createPayout(businessId, input)
    const affiliate = await db.affiliate.findFirst({
      where: { id: affiliateId, businessId },
      select: { stripeConnectAccountId: true, stripePayoutsEnabled: true },
    })
    if (!affiliate?.stripePayoutsEnabled || !affiliate.stripeConnectAccountId) {
      return finance.createPayout(businessId, input)
    }
    return this.pay(businessId, input, affiliate.stripeConnectAccountId)
  }

  async pay(businessId: string, input: CreatePayoutInput, destinationAccountId: string) {
    if (!stripeConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
    const payout = await finance.createConnectPayout(businessId, input)
    if (payout.status === 'TRANSFERRED' || payout.status === 'PAID') return payout
    if (payout.status !== 'PENDING') return payout
    if (payout.stripeTransferId) return payout
    const transfer = await getStripe().transfers.create(
      {
        amount: payout.amountMinor,
        currency: payout.currency.toLowerCase(),
        destination: destinationAccountId,
        metadata: {
          loopiePayoutId: payout.id,
          businessId,
          payoutIdempotencyKey: payout.idempotencyKey,
        },
      },
      { idempotencyKey: payout.idempotencyKey },
    )
    return finance.attachPayoutTransferRef(businessId, payout.id, transfer.id)
  }
}
