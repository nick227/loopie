import { db } from '@project/db'
import type { BusinessLicenseStatus } from '@project/db'

export type ResolvedLicenseState = {
  isEntitled: boolean
  status: BusinessLicenseStatus
  startsAt: Date
  endsAt: Date | null
  source: string
}

export async function getBusinessLicenseState(businessId: string): Promise<ResolvedLicenseState> {
  const license = await db.businessLicense.findUnique({
    where: { businessId },
  })

  // If no license exists, the business has no entitlements.
  if (!license) {
    return {
      isEntitled: false,
      status: 'SUSPENDED',
      startsAt: new Date(),
      endsAt: null,
      source: 'MANUAL',
    }
  }

  const now = new Date()

  // If status is SUSPENDED or EXPIRED, it's strictly not entitled.
  if (license.status !== 'ACTIVE') {
    return {
      isEntitled: false,
      status: license.status,
      startsAt: license.startsAt,
      endsAt: license.endsAt,
      source: license.source,
    }
  }

  // If ACTIVE but the time has passed, treat it as expired for runtime checks.
  if (license.endsAt && license.endsAt < now) {
    return {
      isEntitled: false,
      status: 'EXPIRED',
      startsAt: license.startsAt,
      endsAt: license.endsAt,
      source: license.source,
    }
  }

  // If startsAt is in the future, it is not entitled yet.
  if (license.startsAt > now) {
    return {
      isEntitled: false,
      status: 'SUSPENDED',
      startsAt: license.startsAt,
      endsAt: license.endsAt,
      source: license.source,
    }
  }

  return {
    isEntitled: true,
    status: 'ACTIVE',
    startsAt: license.startsAt,
    endsAt: license.endsAt,
    source: license.source,
  }
}

/**
 * Ensures the business has an active license, throwing 402 if not.
 * @param businessId
 */
export async function requireActiveLicense(businessId: string) {
  const state = await getBusinessLicenseState(businessId)

  if (!state.isEntitled) {
    // 402 Payment Required
    throw {
      statusCode: 402,
      message: `Business license is ${state.status.toLowerCase()}.`,
    }
  }
}
