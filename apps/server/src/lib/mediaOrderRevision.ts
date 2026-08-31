import { createHash } from 'crypto'
import { db } from '@project/db'
import type { Platform } from '@prisma/client'

export type RevisionInput = {
  businessId: string
  advertisementId: string
  platform: Platform
  placement: string | null
  goal: string
  successEvent: string
  country: string
  locationNote: string | null
  radiusMiles: number | null
  dailyBudgetMinor: number
  currency: string
  startAt: Date
  endAt: Date | null
  destinationLandingPageId: string | null
  destinationLandingPageVersionId: string | null
  assetIds: string[]
  accountName: string | null
  accountCurrency: string | null
  accountTimezone: string | null
  adAccountId: string | null
  createdByUserId: string
}

function contentHash(input: RevisionInput) {
  const material = JSON.stringify({
    goal: input.goal,
    successEvent: input.successEvent,
    country: input.country,
    locationNote: input.locationNote,
    radiusMiles: input.radiusMiles,
    dailyBudgetMinor: input.dailyBudgetMinor,
    currency: input.currency,
    startAt: input.startAt.toISOString(),
    endAt: input.endAt?.toISOString() ?? null,
    destinationLandingPageId: input.destinationLandingPageId,
    destinationLandingPageVersionId: input.destinationLandingPageVersionId,
    assetIds: [...input.assetIds].sort(),
  })
  return createHash('sha256').update(material).digest('hex')
}

// One durable, immutable, numbered row per actual send — see MediaOrderRevision's schema doc
// comment for why this exists instead of AdRun.orderSnapshot alone. Revision numbers are scoped
// to (advertisementId, platform, placement): a relaunch to the same destination continues that
// sequence rather than starting a new one, so "revision 3" always means the third real send to
// this exact destination, regardless of how many other destinations this Advertisement has.
export async function freezeMediaOrderRevision(input: RevisionInput) {
  const last = await db.mediaOrderRevision.findFirst({
    where: {
      advertisementId: input.advertisementId,
      platform: input.platform,
      placement: input.placement,
    },
    orderBy: { revision: 'desc' },
  })
  const revision = (last?.revision ?? 0) + 1
  return db.mediaOrderRevision.create({
    data: {
      businessId: input.businessId,
      advertisementId: input.advertisementId,
      platform: input.platform,
      placement: input.placement,
      revision,
      goal: input.goal,
      successEvent: input.successEvent,
      country: input.country,
      locationNote: input.locationNote,
      radiusMiles: input.radiusMiles,
      dailyBudgetMinor: input.dailyBudgetMinor,
      currency: input.currency,
      startAt: input.startAt,
      endAt: input.endAt,
      destinationLandingPageId: input.destinationLandingPageId,
      destinationLandingPageVersionId: input.destinationLandingPageVersionId,
      assetIds: input.assetIds,
      accountName: input.accountName,
      accountCurrency: input.accountCurrency,
      accountTimezone: input.accountTimezone,
      adAccountId: input.adAccountId,
      contentHash: contentHash(input),
      createdByUserId: input.createdByUserId,
    },
  })
}
