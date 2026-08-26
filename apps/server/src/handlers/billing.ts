import type { AuthedUser } from '../lib/affiliateRoles'
import { requireAdmin } from '../lib/affiliateRoles'
import { StripeBillingService } from '../services/StripeBillingService'

const billing = new StripeBillingService()

type BillingUser = AuthedUser & { email: string }

export async function getBilling(request: { user: AuthedUser }, reply: { send: (body: unknown) => unknown }) {
  requireAdmin(request.user)
  return reply.send({ data: await billing.get(request.user.businessId) })
}

export async function createBillingCheckout(
  request: { user: BillingUser },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  requireAdmin(request.user)
  const session = await billing.createCheckout(request.user)
  return reply.status(201).send({ data: session })
}

export async function createBillingPortal(
  request: { user: BillingUser },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  requireAdmin(request.user)
  const session = await billing.createPortal(request.user)
  return reply.status(201).send({ data: session })
}
