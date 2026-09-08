import { db } from '@project/db'
import { FinanceService } from './FinanceService'

const finance = new FinanceService()

// A refund/dispute window needs to have realistically closed before a platform-affiliate earning
// becomes payable — otherwise a normal refund on money that's already been paid out to an
// affiliate would need to be clawed back after the fact instead of simply not-yet-owed. Unlike
// the client-side Affiliate.eligibilityWindowDays, there's no per-deal policy field for this on
// the platform-affiliate program (PlatformAffiliateDeal) — a single fixed constant is the whole
// policy for now.
export const PLATFORM_EARNING_CLEARING_DAYS = 14

/** Promotes every PENDING PlatformAffiliateEarning whose membership payment cleared the window
 * above to PAYABLE, posting the real house-ledger liability for each (see
 * FinanceService.promotePlatformEarningPayable). One ledger post per earning, so a crash midway
 * through just leaves the remainder for the next poll — nothing here is a single all-or-nothing
 * batch. */
export async function runDuePlatformEarningPromotions(): Promise<{
  processed: number
  promoted: number
}> {
  const cutoff = new Date(Date.now() - PLATFORM_EARNING_CLEARING_DAYS * 24 * 60 * 60 * 1000)
  const due = await db.platformAffiliateEarning.findMany({
    where: { status: 'PENDING', membershipPayment: { settledAt: { lte: cutoff } } },
    select: { id: true },
  })

  let promoted = 0
  for (const earning of due) {
    await finance.promotePlatformEarningPayable(
      earning.id,
      `platform-earning:payable:${earning.id}`,
    )
    promoted++
  }
  return { processed: due.length, promoted }
}
