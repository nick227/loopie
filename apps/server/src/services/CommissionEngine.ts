import { db } from '@project/db'

export class CommissionEngine {
  /**
   * Process a membership payment and generate any corresponding affiliate earnings.
   * Based on the BusinessAffiliateAttribution snapshot at the time of processing.
   */
  async processMembershipPayment(
    businessId: string,
    amountMinor: number,
    overrides?: {
      stripeInvoiceId?: string
      stripeChargeId?: string
    },
  ) {
    return await db.$transaction(async (tx) => {
      // 0. Check for idempotency
      if (overrides?.stripeInvoiceId || overrides?.stripeChargeId) {
        const existing = await tx.membershipPayment.findFirst({
          where: {
            OR: [
              { stripeInvoiceId: overrides.stripeInvoiceId || undefined },
              { stripeChargeId: overrides.stripeChargeId || undefined },
            ],
            businessId,
          },
        })
        if (existing) return existing
      }

      // 1. Record the payment
      const payment = await tx.membershipPayment.create({
        data: {
          businessId,
          amountMinor,
          stripeInvoiceId: overrides?.stripeInvoiceId,
          stripeChargeId: overrides?.stripeChargeId,
        },
      })

      // 2. Lookup attribution
      const attribution = await tx.businessAffiliateAttribution.findUnique({
        where: { businessId },
        include: {
          affiliate: { select: { userId: true } },
          managerAffiliate: { select: { userId: true } },
        },
      })

      if (!attribution) return payment

      // A business that's paid once is locked going forward — see setBusinessAttribution's
      // matching read of this same field. Set unconditionally on first payment, independent of
      // whether this specific attribution ends up eligible below.
      if (!attribution.lockedAfterPaymentAt) {
        await tx.businessAffiliateAttribution.update({
          where: { businessId },
          data: { lockedAfterPaymentAt: payment.settledAt },
        })
      }

      // Primary eligibility gate: a stored decision, not a live recomputation. setBusinessAttribution
      // decides eligibility once at approval time and snapshots the affiliate/manager's userId;
      // invalidateAttributionOnNewMembership (called from every place a BusinessMembership is
      // created for an existing business — see TeamService.acceptInvitation) is what flips this to
      // INVALIDATED later. Reading `status` here means payment processing never races a concurrent
      // membership change: whatever the state was at the start of this transaction is authoritative,
      // and a membership change that lands after can only affect the *next* payment, never this one.
      if (attribution.status !== 'ACTIVE') {
        console.warn('CommissionEngine: skipped earnings — attribution is not ACTIVE', {
          businessId,
          affiliateId: attribution.affiliateId,
          status: attribution.status,
          invalidatedReason: attribution.invalidatedReason,
        })
        return payment
      }

      // Lightweight sanity check, kept as defense-in-depth per design: the snapshot/invalidation
      // mechanism above is the authoritative decision, so finding a live overlap here means that
      // mechanism has a gap somewhere (a membership-creation path that isn't hooked up to
      // invalidateAttributionOnNewMembership) — logged loudly as a real bug to chase, not routine.
      const directOverlap = attribution.affiliate.userId
        ? await tx.businessMembership.findFirst({
            where: { businessId, userId: attribution.affiliate.userId },
          })
        : null
      const managerOverlap = attribution.managerAffiliate?.userId
        ? await tx.businessMembership.findFirst({
            where: { businessId, userId: attribution.managerAffiliate.userId },
          })
        : null
      if (directOverlap || managerOverlap) {
        console.error(
          'CommissionEngine: STATE MODEL GAP — live ownership overlap found on an ACTIVE attribution. ' +
            'invalidateAttributionOnNewMembership should have caught this; find the membership-creation ' +
            'path that skipped it.',
          {
            businessId,
            affiliateId: attribution.affiliateId,
            directOverlap: !!directOverlap,
            managerOverlap: !!managerOverlap,
          },
        )
      }

      // 3. Calculate Direct Commission — the base for a manager override is this computed amount
      // regardless of whether the direct earning itself gets created, since the override is "a
      // share of what the direct commission would have been," not a share of a row that exists.
      const directAmountMinor = Math.round((amountMinor * attribution.affiliateRateBps) / 10000)

      if (directOverlap) {
        console.warn(
          'CommissionEngine: skipped direct earning — affiliate overlaps business ownership',
          {
            businessId,
            affiliateId: attribution.affiliateId,
          },
        )
      } else if (directAmountMinor > 0) {
        await tx.platformAffiliateEarning.create({
          data: {
            membershipPaymentId: payment.id,
            beneficiaryAffiliateId: attribution.affiliateId,
            sourceAffiliateId: attribution.affiliateId, // direct sale
            type: 'DIRECT',
            baseAmountMinor: amountMinor,
            rateBps: attribution.affiliateRateBps,
            amountMinor: directAmountMinor,
            status: 'PENDING',
          },
        })
      }

      // 4. Calculate Manager Override (if applicable) — independent of directOverlap above.
      if (attribution.managerAffiliateId && attribution.managerShareBps) {
        const managerAmountMinor = Math.round(
          (directAmountMinor * attribution.managerShareBps) / 10000,
        )
        if (managerOverlap) {
          console.warn(
            'CommissionEngine: skipped manager-override earning — manager overlaps business ownership',
            { businessId, managerAffiliateId: attribution.managerAffiliateId },
          )
        } else if (managerAmountMinor > 0) {
          await tx.platformAffiliateEarning.create({
            data: {
              membershipPaymentId: payment.id,
              beneficiaryAffiliateId: attribution.managerAffiliateId,
              sourceAffiliateId: attribution.affiliateId, // generated by this affiliate's sale
              type: 'MANAGER_OVERRIDE',
              baseAmountMinor: directAmountMinor, // override is applied to the direct commission amount
              rateBps: attribution.managerShareBps,
              amountMinor: managerAmountMinor,
              status: 'PENDING',
            },
          })
        }
      }

      return payment
    })
  }

  /**
   * Reverse a membership payment and its associated earnings without mutating historical amounts.
   */
  async reverseMembershipPayment(paymentId: string) {
    return await db.$transaction(async (tx) => {
      // Find the original earnings associated with this payment
      const earnings = await tx.platformAffiliateEarning.findMany({
        where: { membershipPaymentId: paymentId, status: { not: 'REVERSED' } },
      })

      for (const earning of earnings) {
        if (earning.status === 'PENDING') {
          // If still pending, we can simply mark it as reversed
          await tx.platformAffiliateEarning.update({
            where: { id: earning.id },
            data: { status: 'REVERSED' },
          })
        } else {
          // If already PAYABLE or PAID, preserve original status and append an offsetting negative line item
          // The negative line item is PAYABLE so it deducts from their next payout
          await tx.platformAffiliateEarning.create({
            data: {
              membershipPaymentId: earning.membershipPaymentId,
              beneficiaryAffiliateId: earning.beneficiaryAffiliateId,
              sourceAffiliateId: earning.sourceAffiliateId,
              type: earning.type,
              baseAmountMinor: -earning.baseAmountMinor,
              rateBps: earning.rateBps,
              amountMinor: -earning.amountMinor,
              status: 'PAYABLE',
              reversesEarningId: earning.id,
            },
          })
        }
      }
    })
  }

  /**
   * Mark earnings as payable after any refund window or clearing period has passed.
   */
  async markPayable(earningIds: string[]) {
    await db.platformAffiliateEarning.updateMany({
      where: {
        id: { in: earningIds },
        status: 'PENDING',
      },
      data: {
        status: 'PAYABLE',
      },
    })
  }
}
