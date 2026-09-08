import { db } from '@project/db'
import { isUniqueConflict } from '../lib/prismaError'
import { FinanceService } from './FinanceService'

const financeService = new FinanceService()

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
    try {
      return await this._processMembershipPayment(businessId, amountMinor, overrides)
    } catch (err) {
      // A genuine concurrent double-delivery of the same Stripe event can lose the race between
      // the read-check below and this create — stripeInvoiceId/stripeChargeId are each @unique,
      // so the loser hits a real Prisma P2002, not a logic bug. Same replay-on-conflict pattern
      // as every other idempotency-keyed write in the finance module (see lib/finance/ledger.ts).
      if (!isUniqueConflict(err) || !(overrides?.stripeInvoiceId || overrides?.stripeChargeId)) {
        throw err
      }
      const existing = await db.membershipPayment.findFirst({
        where: {
          OR: [
            { stripeInvoiceId: overrides.stripeInvoiceId || undefined },
            { stripeChargeId: overrides.stripeChargeId || undefined },
          ],
          businessId,
        },
      })
      if (!existing) throw err
      return existing
    }
  }

  private async _processMembershipPayment(
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
   * Reverse (fully or partially) the earnings generated from a membership payment, in response to
   * a refund or a dispute. `refundedAmountMinor` is the *cumulative* amount refunded/disputed on
   * the underlying Stripe charge so far (Stripe's own `charge.amount_refunded` semantics) — not a
   * delta — so repeated partial-refund events and a later dispute-won restoration (a smaller
   * cumulative amount than before) both fall out of the same math. Omitting it means a full
   * reversal (a dispute being opened withdraws the full charge immediately).
   *
   * Each original DIRECT/MANAGER_OVERRIDE earning (rows with `reversesEarningId: null`) is
   * adjusted independently:
   *  - Still PENDING (never promoted to the ledger): the earning's own amount is set directly to
   *    the un-reversed remainder. No ledger call — nothing was ever posted for it.
   *  - PAYABLE/PAID (already promoted): the running net adjustment lives in the single reversal
   *    row `reversesEarningId` allows per original (a real @unique constraint, so it's upserted
   *    to the new cumulative target rather than appended-to), while the *ledger* posting is a
   *    true append-only delta between the old and new cumulative target — a LedgerTransaction
   *    can't be edited after the fact. The original earning's own amount/status are never
   *    touched; a reconciliation report nets the original against its reversal row.
   *
   * `eventId` should be the triggering Stripe event id whenever one exists (a refund or dispute
   * webhook) — it keys the ledger-side idempotency check so replaying that exact event is a safe
   * no-op, without colliding with a *different* event that happens to land on the same cumulative
   * target amount (see the idempotencyKey comment below).
   *
   * `allowDecrease` (default false) guards against a real ordering hazard: refunds and disputes
   * are independent Stripe mechanisms — `charge.amount_refunded` never reflects an open dispute's
   * withheld amount, and real refunds are themselves monotonically non-decreasing (Stripe has no
   * "un-refund"). So a `charge.refunded` event's own target must never be allowed to *lower* the
   * amount already reversed — whether that floor came from a larger prior refund (an out-of-order
   * redelivery) or from an open dispute (`_onDisputeCreated`'s ratio-1 call) — or a stray/delayed
   * refund event arriving mid-dispute would silently release money that's still actually withheld.
   * Only a dispute's own resolution genuinely intends to lower the total (`_onDisputeClosed`'s won
   * case passes `allowDecrease: true`); every other caller takes the floor.
   */
  async reverseMembershipPayment(
    paymentId: string,
    opts?: {
      refundedAmountMinor?: number
      reason?: string
      eventId?: string
      allowDecrease?: boolean
    },
  ) {
    const payment = await db.membershipPayment.findUnique({ where: { id: paymentId } })
    if (!payment) throw { statusCode: 404, message: 'Membership payment not found' }
    const ratio =
      opts?.refundedAmountMinor != null && payment.amountMinor > 0
        ? Math.min(1, Math.max(0, opts.refundedAmountMinor / payment.amountMinor))
        : 1

    return await db.$transaction(async (tx) => {
      const originals = await tx.platformAffiliateEarning.findMany({
        where: { membershipPaymentId: paymentId, reversesEarningId: null },
      })

      const touched = []
      for (const earning of originals) {
        const pristineAmountMinor = Math.round((earning.baseAmountMinor * earning.rateBps) / 10000)
        const requestedTargetAbs = Math.min(
          pristineAmountMinor,
          Math.max(0, Math.round(pristineAmountMinor * ratio)),
        )

        if (earning.status === 'PENDING') {
          const currentlyReversedAbs = pristineAmountMinor - earning.amountMinor
          const targetReversedAbs = opts?.allowDecrease
            ? requestedTargetAbs
            : Math.max(requestedTargetAbs, currentlyReversedAbs)
          const nextAmount = pristineAmountMinor - targetReversedAbs
          if (nextAmount === earning.amountMinor) {
            touched.push(earning)
            continue
          }
          touched.push(
            await tx.platformAffiliateEarning.update({
              where: { id: earning.id },
              data: { amountMinor: nextAmount },
            }),
          )
          continue
        }

        if (earning.status !== 'PAYABLE' && earning.status !== 'PAID') {
          touched.push(earning) // REVERSED (or any future terminal state) — nothing left to adjust
          continue
        }

        const existingLine = await tx.platformAffiliateEarning.findUnique({
          where: { reversesEarningId: earning.id },
        })
        const alreadyReversedAbs = existingLine ? -existingLine.amountMinor : 0
        const targetReversedAbs = opts?.allowDecrease
          ? requestedTargetAbs
          : Math.max(requestedTargetAbs, alreadyReversedAbs)
        const deltaAbs = targetReversedAbs - alreadyReversedAbs
        if (deltaAbs === 0) {
          touched.push(existingLine ?? earning)
          continue
        }

        // Keyed by the triggering event (falling back to the target amount only when none is
        // given), not by the resulting target amount alone — two distinct events that happen to
        // land on the same cumulative target from opposite directions (e.g. a REDUCE to 5000
        // followed later by a RESTORE back down to 5000) must never collide on one idempotency
        // key, or the second one would be silently swallowed as a "replay" of the first.
        const idempotencyKey = opts?.eventId
          ? `platform-earning:adjust:${earning.id}:${opts.eventId}`
          : `platform-earning:adjust:${earning.id}:${targetReversedAbs}`
        await financeService.adjustPlatformEarningLedgerInTx(tx, {
          originalEarningId: earning.id,
          amountMinor: Math.abs(deltaAbs),
          direction: deltaAbs > 0 ? 'REDUCE' : 'RESTORE',
          idempotencyKey,
          reason: opts?.reason,
        })

        const line = existingLine
          ? await tx.platformAffiliateEarning.update({
              where: { id: existingLine.id },
              data: { amountMinor: -targetReversedAbs, baseAmountMinor: -targetReversedAbs },
            })
          : await tx.platformAffiliateEarning.create({
              data: {
                membershipPaymentId: earning.membershipPaymentId,
                beneficiaryAffiliateId: earning.beneficiaryAffiliateId,
                sourceAffiliateId: earning.sourceAffiliateId,
                type: earning.type,
                baseAmountMinor: -targetReversedAbs,
                rateBps: earning.rateBps,
                amountMinor: -targetReversedAbs,
                status: 'PAYABLE',
                reversesEarningId: earning.id,
              },
            })
        touched.push(line)
      }
      return touched
    })
  }
}
