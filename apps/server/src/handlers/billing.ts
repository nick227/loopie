import type { AuthUser } from '../lib/membership'
import { requireBusinessOwner } from '../lib/membership'
import { StripeBillingService } from '../services/StripeBillingService'
import { getBusinessLicenseState } from '../lib/licensing'

const billing = new StripeBillingService()

type BillingUser = AuthUser & { email: string }

export async function getBilling(
  request: { user: AuthUser },
  reply: { send: (body: unknown) => unknown },
) {
  requireBusinessOwner(request.user)
  const stripeData = await billing.get(request.user.businessId)
  const licenseState = await getBusinessLicenseState(request.user.businessId)
  return reply.send({
    data: {
      ...stripeData,
      license: {
        isEntitled: licenseState.isEntitled,
        status: licenseState.status,
        startsAt: licenseState.startsAt.toISOString(),
        endsAt: licenseState.endsAt?.toISOString() ?? null,
        source: licenseState.source,
      },
    },
  })
}

export async function createBillingCheckout(
  request: { user: BillingUser },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  requireBusinessOwner(request.user)
  const session = await billing.createCheckout(request.user)
  return reply.status(201).send({ data: session })
}

export async function createBillingPortal(
  request: { user: BillingUser },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  requireBusinessOwner(request.user)
  const session = await billing.createPortal(request.user)
  return reply.status(201).send({ data: session })
}
