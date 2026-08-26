import { db } from '@project/db'
import type { AuthedUser } from '../lib/affiliateRoles'
import { connectFieldsFromAccount } from '../lib/connectStatus'
import { appBaseUrl, getStripe, stripeConfigured } from '../lib/stripe'
import { affiliateInclude, findAffiliate, toAffiliateDTO, withFrozenMoney } from './affiliateDto'

export class StripeConnectService {
  async createOnboardingLink(user: AuthedUser, affiliateId: string) {
    const affiliate = await this._load(user, affiliateId)
    if (!stripeConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
    const stripe = getStripe()
    const accountId = await this._ensureAccount(stripe, affiliate)
    const paths = this._urls(user, affiliate.id)
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: affiliate.stripePayoutsEnabled ? 'account_update' : 'account_onboarding',
      refresh_url: paths.refresh,
      return_url: paths.returnTo,
    })
    return { url: link.url }
  }

  async sync(user: AuthedUser, affiliateId: string) {
    const affiliate = await this._load(user, affiliateId)
    if (!stripeConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
    if (!affiliate.stripeConnectAccountId) throw { statusCode: 409, message: 'No Connect account for this affiliate' }
    const account = await getStripe().accounts.retrieve(affiliate.stripeConnectAccountId)
    const view = await this.applyAccount(account)
    if (!view) throw { statusCode: 404, message: 'Affiliate not found' }
    return view
  }

  async applyAccount(account: {
    id: string
    metadata?: { affiliateId?: string } | null
    payouts_enabled?: boolean | null
    details_submitted?: boolean | null
    requirements?: { disabled_reason?: string | null } | null
  }) {
    const fields = connectFieldsFromAccount(account)
    const existing = await db.affiliate.findFirst({
      where: {
        OR: [
          { stripeConnectAccountId: account.id },
          ...(account.metadata?.affiliateId ? [{ id: account.metadata.affiliateId }] : []),
        ],
      },
      include: affiliateInclude,
    })
    if (!existing) return null
    try {
      const row = await db.affiliate.update({
        where: { id: existing.id },
        data: fields,
        include: affiliateInclude,
      })
      const [view] = await withFrozenMoney(row.businessId, [toAffiliateDTO(row)])
      return view
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') return null
      throw err
    }
  }

  private async _load(user: AuthedUser, affiliateId: string) {
    const affiliate = await findAffiliate(user.businessId, affiliateId)
    if (user.role === 'ADMIN') return affiliate
    if (user.role === 'AFFILIATE' && affiliate.userId === user.id) return affiliate
    throw { statusCode: 403, message: 'Forbidden' }
  }

  private async _ensureAccount(
    stripe: ReturnType<typeof getStripe>,
    affiliate: { id: string; businessId: string; name: string; email: string | null; stripeConnectAccountId: string | null },
  ) {
    if (affiliate.stripeConnectAccountId) return affiliate.stripeConnectAccountId
    if (!affiliate.email) throw { statusCode: 409, message: 'Affiliate email is required to set up payouts' }
    const account = await stripe.accounts.create({
      type: 'express',
      email: affiliate.email,
      country: process.env.STRIPE_CONNECT_COUNTRY ?? 'US',
      metadata: { affiliateId: affiliate.id, businessId: affiliate.businessId },
      capabilities: { transfers: { requested: true } },
      business_profile: { name: affiliate.name },
    })
    await db.affiliate.update({
      where: { id: affiliate.id },
      data: { stripeConnectAccountId: account.id },
    })
    return account.id
  }

  private _urls(user: AuthedUser, affiliateId: string) {
    const base = appBaseUrl()
    if (user.role === 'AFFILIATE') {
      return {
        returnTo: `${base}/portal/payouts?connect=return`,
        refresh: `${base}/portal/payouts?connect=refresh`,
      }
    }
    return {
      returnTo: `${base}/affiliates/${affiliateId}?connect=return`,
      refresh: `${base}/affiliates/${affiliateId}?connect=refresh`,
    }
  }
}
