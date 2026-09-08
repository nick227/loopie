import { randomBytes } from 'crypto'
import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { isUniqueConflict } from '../lib/prismaError'
import { AuditActions, AuditResourceTypes } from '../lib/audit'
import type { AuditActor } from '../lib/audit'
import { FinanceService } from './FinanceService'

const finance = new FinanceService()

// Lowercase alphanumeric — no `-`/`_`/mixed-case ambiguity when a code is read aloud or retyped.
const OPAQUE_CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Opaque, crypto-random — never derived from email/name, so a shared referral link can't leak
 * who it belongs to. Always exactly `length` characters (~51.7 bits of entropy at the default):
 * earlier versions generated base64url and stripped `-`/`_` afterward, which silently shortened
 * (and weakened) any code unlucky enough to contain one instead of redrawing that character. */
function randomOpaqueCode(length = 10): string {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += OPAQUE_CODE_ALPHABET[bytes[i]! % OPAQUE_CODE_ALPHABET.length]
  }
  return code
}

/** Which unique column a P2002 violation was actually on, so a collision on one column (e.g. a
 * generated referralCode) can be retried while a collision on another (e.g. userId, meaning a
 * concurrent request already provisioned this exact row) is handled differently. */
function uniqueConflictField(err: unknown): string | null {
  if (!isUniqueConflict(err)) return null
  const target = (err as { meta?: { target?: unknown } } | undefined)?.meta?.target
  if (Array.isArray(target)) return target.join(',')
  if (typeof target === 'string') return target
  return null
}

async function assertDealBelongsToClass(
  dealId: string | null | undefined,
  classId: string | null | undefined,
) {
  if (!dealId || !classId) return
  const deal = await db.platformAffiliateDeal.findUnique({ where: { id: dealId } })
  if (deal && deal.classId && deal.classId !== classId) {
    throw { statusCode: 400, message: 'Deal does not belong to the specified class' }
  }
}

/** Same invariant as assertDealBelongsToClass, but for a class's own defaultDealId — here
 * `classId: null` is a meaningful case (a brand-new class being created), not "skip the check":
 * a new class may only claim a deal that isn't already exclusively scoped to some other class. */
async function assertDealAvailableForClass(
  dealId: string | null | undefined,
  classId: string | null,
) {
  if (!dealId) return
  const deal = await db.platformAffiliateDeal.findUnique({ where: { id: dealId } })
  if (!deal) throw { statusCode: 404, message: 'Deal not found' }
  if (deal.classId && deal.classId !== classId) {
    throw { statusCode: 400, message: 'Deal already belongs to a different class' }
  }
  // Separate from the check above: PlatformAffiliateClass.defaultDealId is its own DB-level
  // 1:1 unique pointer (independent of Deal.classId, which is just informational grouping) — a
  // given deal can be at most one class's *default* deal at a time. Checked explicitly here
  // rather than only caught as a P2002 after the write, so the error is a clean 409 pre-write.
  const claimedBy = await db.platformAffiliateClass.findFirst({
    where: { defaultDealId: dealId, id: classId ? { not: classId } : undefined },
  })
  if (claimedBy) {
    throw {
      statusCode: 409,
      message: `This deal is already the default for another class (${claimedBy.name})`,
    }
  }
}

/** Backstop for assertDealAvailableForClass's pre-check: two concurrent create/update calls can
 * both pass the SELECT-based check before either commits, so the write itself can still race into
 * defaultDealId's unique constraint. Converts that into the same clean 409 instead of a raw 500. */
function rethrowAsDealConflict(err: unknown): unknown {
  if (uniqueConflictField(err)?.includes('defaultDealId')) {
    return {
      statusCode: 409,
      message: "This deal was just claimed as another class's default — please retry",
    }
  }
  return err
}

/** Structural fraud guard: a referral's beneficiary can never be a member (owner or otherwise)
 * of the business it's attributed to. This is intentionally unconditional — unlike the
 * post-payment immutability lock below, there is no admin override for this one. It only catches
 * same-account self-referral; a different-email/same-person referral requires a signal this
 * service doesn't have (shared payment instrument, device, etc.) — flagged as a longer-term
 * fraud-detection gap, not something attribution-time checks can close. */
async function assertNoOwnershipOverlap(affiliateUserId: string | null, businessId: string) {
  if (!affiliateUserId) return
  const membership = await db.businessMembership.findFirst({
    where: { businessId, userId: affiliateUserId },
  })
  if (membership) {
    throw {
      statusCode: 400,
      message:
        'This affiliate is a member of the business being referred — self-referral is not allowed',
    }
  }
}

/**
 * The other half of the state-transition model: setBusinessAttribution decides eligibility once,
 * at approval, and snapshots the affiliate/manager's userId onto the row. This is the event that
 * can invalidate that decision later — call it, inside the SAME transaction as the write, from
 * every place a BusinessMembership is created for an *existing* business (currently just
 * TeamService.acceptInvitation; see that codebase's own audit of membership-creation call sites —
 * ensureHomeMembership only backfills a user's own pre-existing business, never adds them to a
 * business they weren't already tied to, so it isn't a self-referral vector and isn't hooked here).
 * A no-op if this business has no ACTIVE attribution or the new member doesn't match its snapshot.
 */
export async function invalidateAttributionOnNewMembership(
  tx: Prisma.TransactionClient,
  businessId: string,
  newMemberUserId: string,
) {
  const attribution = await tx.businessAffiliateAttribution.findUnique({ where: { businessId } })
  if (!attribution || attribution.status !== 'ACTIVE') return
  const overlaps =
    attribution.affiliateUserIdSnapshot === newMemberUserId ||
    attribution.managerUserIdSnapshot === newMemberUserId
  if (!overlaps) return

  await tx.businessAffiliateAttribution.update({
    where: { businessId },
    data: {
      status: 'INVALIDATED',
      invalidatedAt: new Date(),
      invalidatedReason:
        'The referring affiliate (or its manager) became a member of this business',
    },
  })
}

export const platformAffiliateInclude = {
  // Nested so an affiliate provisioned only into a class (no direct dealId) can still resolve a
  // live rate from the class's own default deal — see currentRateBps in AffiliateProgramPage.tsx.
  class: { include: { defaultDeal: true } },
  deal: true,
  manager: true,
  user: { select: { id: true, email: true } },
} satisfies Prisma.PlatformAffiliateInclude

export const platformAffiliateDealInclude = {
  class: true,
} satisfies Prisma.PlatformAffiliateDealInclude

export class PlatformAffiliateService {
  async listAffiliates() {
    const affiliates = await db.platformAffiliate.findMany({
      include: platformAffiliateInclude,
      orderBy: { createdAt: 'desc' },
    })
    return { data: affiliates }
  }

  async getAffiliate(id: string) {
    const affiliate = await db.platformAffiliate.findUnique({
      where: { id },
      include: platformAffiliateInclude,
    })
    if (!affiliate) throw { statusCode: 404, message: 'Platform affiliate not found' }
    return { data: affiliate }
  }

  async createAffiliate(input: {
    name: string
    email?: string | null
    referralCode?: string
    classId?: string | null
    dealId?: string | null
    managerId?: string | null
    userId?: string | null
  }) {
    if (!input.name) throw { statusCode: 400, message: 'Name is required' }
    await assertDealBelongsToClass(input.dealId, input.classId)

    const baseData = {
      name: input.name,
      email: input.email,
      classId: input.classId,
      dealId: input.dealId,
      managerId: input.managerId,
      userId: input.userId,
    }

    if (input.referralCode) {
      // An admin-chosen code must be honored exactly or rejected — never silently substituted.
      const existing = await db.platformAffiliate.findUnique({
        where: { referralCode: input.referralCode },
      })
      if (existing) throw { statusCode: 409, message: 'Referral code already exists' }
      const affiliate = await db.platformAffiliate.create({
        data: { ...baseData, referralCode: input.referralCode },
        include: platformAffiliateInclude,
      })
      return { data: affiliate }
    }

    const maxAttempts = 8
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const affiliate = await db.platformAffiliate.create({
          data: { ...baseData, referralCode: randomOpaqueCode() },
          include: platformAffiliateInclude,
        })
        return { data: affiliate }
      } catch (err) {
        if (uniqueConflictField(err)?.includes('referralCode')) continue
        console.error('createAffiliate: referral code create failed', err)
        throw err
      }
    }
    console.error('createAffiliate: exhausted referral code generation attempts', {
      attempts: maxAttempts,
    })
    throw { statusCode: 500, message: 'Could not generate a unique referral code — please retry' }
  }

  async updateAffiliate(
    id: string,
    input: {
      name?: string
      email?: string | null
      classId?: string | null
      dealId?: string | null
      managerId?: string | null
      affiliateRateOverrideBps?: number | null
      managerShareOverrideBps?: number | null
      isActive?: boolean
    },
  ) {
    const existing = await db.platformAffiliate.findUnique({ where: { id } })
    if (!existing) throw { statusCode: 404, message: 'Platform affiliate not found' }

    // Validate against whichever of dealId/classId is ending up set, not just a pair changing
    // together — e.g. reassigning only dealId while classId already exists on the row must still
    // be checked against that existing classId.
    const effectiveDealId = input.dealId !== undefined ? input.dealId : existing.dealId
    const effectiveClassId = input.classId !== undefined ? input.classId : existing.classId
    await assertDealBelongsToClass(effectiveDealId, effectiveClassId)

    const data: Prisma.PlatformAffiliateUncheckedUpdateInput = {}
    if (input.name !== undefined) data.name = input.name
    if (input.email !== undefined) data.email = input.email
    if (input.classId !== undefined) data.classId = input.classId
    if (input.dealId !== undefined) data.dealId = input.dealId
    if (input.managerId !== undefined) data.managerId = input.managerId
    if (input.affiliateRateOverrideBps !== undefined)
      data.affiliateRateOverrideBps = input.affiliateRateOverrideBps
    if (input.managerShareOverrideBps !== undefined)
      data.managerShareOverrideBps = input.managerShareOverrideBps
    if (input.isActive !== undefined) data.isActive = input.isActive

    const affiliate = await db.platformAffiliate.update({
      where: { id },
      data,
      include: platformAffiliateInclude,
    })
    return { data: affiliate }
  }

  // --- Deals & Classes ---

  async listDeals() {
    const deals = await db.platformAffiliateDeal.findMany({
      include: platformAffiliateDealInclude,
      orderBy: { createdAt: 'desc' },
    })
    return { data: deals }
  }

  async createDeal(input: {
    name: string
    classId?: string | null
    affiliateRateBps?: number | null
    managerShareBps: number
  }) {
    if (!input.name) throw { statusCode: 400, message: 'Name is required' }
    const deal = await db.platformAffiliateDeal.create({
      data: {
        name: input.name,
        classId: input.classId,
        affiliateRateBps: input.affiliateRateBps,
        managerShareBps: input.managerShareBps,
      },
      include: platformAffiliateDealInclude,
    })
    return { data: deal }
  }

  async listClasses() {
    const classes = await db.platformAffiliateClass.findMany({
      include: { defaultDeal: true },
      orderBy: { createdAt: 'desc' },
    })
    return { data: classes }
  }

  async createClass(input: { name: string; defaultDealId?: string | null }) {
    if (!input.name) throw { statusCode: 400, message: 'Name is required' }
    await assertDealAvailableForClass(input.defaultDealId, null)
    try {
      const cls = await db.platformAffiliateClass.create({
        data: { name: input.name, defaultDealId: input.defaultDealId },
        include: { defaultDeal: true },
      })
      return { data: cls }
    } catch (err) {
      throw rethrowAsDealConflict(err)
    }
  }

  async updateClass(id: string, input: { defaultDealId?: string | null }) {
    const existing = await db.platformAffiliateClass.findUnique({ where: { id } })
    if (!existing) throw { statusCode: 404, message: 'Platform affiliate class not found' }
    await assertDealAvailableForClass(input.defaultDealId, id)
    try {
      const cls = await db.platformAffiliateClass.update({
        where: { id },
        data: { defaultDealId: input.defaultDealId },
        include: { defaultDeal: true },
      })
      return { data: cls }
    } catch (err) {
      throw rethrowAsDealConflict(err)
    }
  }

  /**
   * Marks one class as the auto-provisioning default for new users, unsetting any other.
   * `defaultSlot` is a DB-level unique singleton lock (see schema.prisma), not just an
   * app-level "clear then set" — two concurrent calls targeting different classes can't both
   * commit, because the second one's UPDATE collides on the unique `defaultSlot` value and is
   * rejected with a clean 409 rather than silently leaving two rows marked default.
   */
  async setDefaultClass(classId: string) {
    try {
      return await db.$transaction(async (tx) => {
        const cls = await tx.platformAffiliateClass.findUnique({ where: { id: classId } })
        if (!cls) throw { statusCode: 404, message: 'Platform affiliate class not found' }
        await tx.platformAffiliateClass.updateMany({
          where: { defaultSlot: 'DEFAULT', id: { not: classId } },
          data: { isDefault: false, defaultSlot: null },
        })
        const updated = await tx.platformAffiliateClass.update({
          where: { id: classId },
          data: { isDefault: true, defaultSlot: 'DEFAULT' },
          include: { defaultDeal: true },
        })
        return { data: updated }
      })
    } catch (err) {
      if (uniqueConflictField(err)?.includes('defaultSlot')) {
        throw {
          statusCode: 409,
          message: 'Another admin just changed the default class — please retry',
        }
      }
      throw err
    }
  }

  // --- Attributions ---

  async getAttributionForBusiness(businessId: string) {
    const attr = await db.businessAffiliateAttribution.findUnique({
      where: { businessId },
      include: {
        affiliate: true,
        managerAffiliate: true,
        affiliateDeal: true,
      },
    })
    return { data: attr }
  }

  /**
   * Sets (or reassigns) which platform affiliate a business's membership payments are attributed
   * to. Three fraud/integrity guards, per the product's explicit "release blocker" list:
   *  1. The affiliate can never be a member (owner or otherwise) of the business being referred —
   *     unconditional, no override. Only catches same-account self-referral; a different-email/
   *     same-person referral needs a signal this method doesn't have (shared payment instrument,
   *     device, etc.) and is a deliberately deferred, longer-term fraud-detection gap.
   *  2. Once the business has any real MembershipPayment, the attribution is locked — a
   *     reassignment past that point requires `force: true`, which only the SITE_ADMIN-gated
   *     HTTP handler ever sets (registration's own call never does).
   *  3. Every create/reassignment is audit-logged, including forced overrides.
   */
  async setBusinessAttribution(
    businessId: string,
    affiliateId: string,
    opts: { actor: AuditActor; force?: boolean },
  ) {
    const { actor, force = false } = opts

    const affiliate = await db.platformAffiliate.findUnique({
      where: { id: affiliateId },
      include: { deal: true, class: { include: { defaultDeal: true } }, manager: true },
    })
    if (!affiliate) throw { statusCode: 404, message: 'Platform affiliate not found' }

    await assertNoOwnershipOverlap(affiliate.userId, businessId)

    // Resolve active deal
    const deal = affiliate.deal || affiliate.class?.defaultDeal
    if (!deal) throw { statusCode: 409, message: 'Affiliate has no active deal configured' }

    // Resolve rates
    const affiliateRateBps = affiliate.affiliateRateOverrideBps ?? deal.affiliateRateBps ?? 0
    const managerAffiliateId = affiliate.managerId
    const managerShareBps = managerAffiliateId
      ? (affiliate.managerShareOverrideBps ?? deal.managerShareBps)
      : null

    // The manager side of the same guard — a manager override is still a commission on this
    // business's payments, so a manager who's a member of it is just as much a self-referral.
    if (managerAffiliateId) {
      await assertNoOwnershipOverlap(affiliate.manager?.userId ?? null, businessId)
    }

    const existingAttribution = await db.businessAffiliateAttribution.findUnique({
      where: { businessId },
    })

    // A stored fact (set once by CommissionEngine on first payment), not a live
    // membershipPayment lookup — the lock check is itself a state read, same principle as the
    // eligibility check at payment time below.
    if (existingAttribution?.lockedAfterPaymentAt && !force) {
      throw {
        statusCode: 409,
        message:
          'This business has already been billed — its referral attribution is locked. Pass force to override.',
      }
    }

    // Attribution write + its audit record must succeed or fail together: emitAuditEvent
    // deliberately swallows failures everywhere else (a good default so a logging hiccup never
    // blocks the real action), but that's wrong for this one specifically — the audit trail is
    // the entire point of the force-override path, so writing the audit event directly inside the
    // same transaction as the upsert means a failed audit write rolls back the reassignment too,
    // rather than leaving a real change with no record of who made it or that it was forced.
    const attr = await db.$transaction(async (tx) => {
      // Every (re)assignment is a fresh approval decision — status/approvedAt/invalidatedAt
      // reset accordingly, and the owner-identity snapshot is what membership-creation call
      // sites (see TeamService.acceptInvitation) check against later to decide whether a new
      // member just turned this attribution into a self-referral. lockedAfterPaymentAt is
      // deliberately NOT touched here — it describes the business's own billing history, not
      // this particular affiliate assignment, so it persists across a reassignment.
      const sharedFields = {
        affiliateId,
        affiliateDealId: deal.id,
        affiliateRateBps,
        managerAffiliateId,
        managerShareBps,
        status: 'ACTIVE' as const,
        approvedAt: new Date(),
        invalidatedAt: null,
        invalidatedReason: null,
        affiliateUserIdSnapshot: affiliate.userId,
        managerUserIdSnapshot: affiliate.manager?.userId ?? null,
      }
      const written = await tx.businessAffiliateAttribution.upsert({
        where: { businessId },
        update: sharedFields,
        create: { businessId, ...sharedFields },
        include: { affiliate: true, managerAffiliate: true },
      })

      await tx.auditEvent.create({
        data: {
          actorUserId: actor.id,
          actorPlatformRole: actor.platformRole,
          action: existingAttribution
            ? AuditActions.AFFILIATE_ATTRIBUTION_REASSIGNED
            : AuditActions.AFFILIATE_ATTRIBUTION_CREATED,
          resourceType: AuditResourceTypes.PLATFORM_AFFILIATE_ATTRIBUTION,
          resourceId: written.id,
          businessId,
          metadata: {
            previousAffiliateId: existingAttribution?.affiliateId ?? null,
            affiliateId,
            forced: existingAttribution ? force : false,
          },
          supportSessionId: actor.supportSessionId ?? null,
        },
      })

      return written
    })

    return { data: attr }
  }

  async listAttributions() {
    const attributions = await db.businessAffiliateAttribution.findMany({
      include: {
        business: { select: { id: true, name: true } },
        affiliate: true,
        managerAffiliate: true,
        affiliateDeal: true,
      },
      orderBy: { attributedAt: 'desc' },
    })
    return { data: attributions }
  }

  // --- Provisioning ---

  /**
   * Every user gets their own PlatformAffiliate record (referral link + rate), auto-created at
   * registration and self-healed here for any pre-existing account that predates that. Resolves
   * the admin-configured default class/deal for the starting rate — with none configured, the
   * affiliate starts with no active deal (0%) until an admin assigns one.
   */
  async getOrCreateForUser(user: { id: string; email: string }) {
    const existing = await db.platformAffiliate.findUnique({
      where: { userId: user.id },
      include: platformAffiliateInclude,
    })
    if (existing) return existing

    const defaultClass = await db.platformAffiliateClass.findFirst({
      where: { isDefault: true, isActive: true },
    })

    // Opaque, crypto-random code — never derived from email/name (a shared referral link must
    // not leak who it belongs to). Retries only on a genuine referralCode collision; a userId
    // collision means a concurrent request already provisioned this exact user's row, which is
    // the benign case handled below, not a retry case.
    const maxAttempts = 8
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await db.platformAffiliate.create({
          data: {
            name: user.email,
            email: user.email,
            referralCode: randomOpaqueCode(),
            userId: user.id,
            classId: defaultClass?.id,
            dealId: defaultClass?.defaultDealId,
          },
          include: platformAffiliateInclude,
        })
      } catch (err) {
        const field = uniqueConflictField(err)
        if (field?.includes('userId')) {
          // Lost a create race (e.g. concurrent requests right after registration) — the row
          // already exists; this is expected, not an error.
          const raced = await db.platformAffiliate.findUnique({
            where: { userId: user.id },
            include: platformAffiliateInclude,
          })
          if (raced) return raced
          // Unique-violated on userId but a re-fetch finds nothing — genuinely unexpected.
          console.error('getOrCreateForUser: userId conflict but no row found on re-fetch', {
            userId: user.id,
          })
          throw { statusCode: 500, message: 'Could not provision affiliate record' }
        }
        if (field?.includes('referralCode')) continue // retry with a fresh code
        console.error('getOrCreateForUser: unexpected create failure', { userId: user.id, err })
        throw err
      }
    }
    console.error('getOrCreateForUser: exhausted referral code generation attempts', {
      userId: user.id,
      attempts: maxAttempts,
    })
    throw { statusCode: 500, message: 'Could not generate a unique referral code — please retry' }
  }

  // --- Affiliate Portal Methods ---

  async getAffiliateOverview(user: { id: string; email: string }) {
    const affiliate = await this.getOrCreateForUser(user)

    // Aggregate attributions for clients and licenses
    const attributions = await db.businessAffiliateAttribution.findMany({
      where: {
        OR: [{ affiliateId: affiliate.id }, { managerAffiliateId: affiliate.id }],
      },
      include: { business: { include: { license: true } } },
    })

    const clients = attributions.length
    const activeLicenses = attributions.filter(
      (a) => a.business?.license?.status === 'ACTIVE',
    ).length

    // Aggregate membership revenue for those businesses
    const businessIds = attributions.map((a) => a.businessId)
    const membershipPayments = await db.membershipPayment.aggregate({
      where: { businessId: { in: businessIds } },
      _sum: { amountMinor: true },
    })
    const membershipRevenueMinor = membershipPayments._sum.amountMinor ?? 0

    // Aggregate earnings
    const earnings = await db.platformAffiliateEarning.groupBy({
      by: ['status'],
      where: { beneficiaryAffiliateId: affiliate.id },
      _sum: { amountMinor: true },
    })
    const getStatusSum = (status: string) =>
      earnings.find((e) => e.status === status)?._sum.amountMinor ?? 0

    return {
      data: {
        clients,
        activeLicenses,
        membershipRevenueMinor,
        pendingEarningsMinor: getStatusSum('PENDING'),
        payableEarningsMinor: getStatusSum('PAYABLE'),
        paidEarningsMinor: getStatusSum('PAID'),
      },
    }
  }

  async getAffiliateClients(user: { id: string; email: string }) {
    const affiliate = await this.getOrCreateForUser(user)

    const attributions = await db.businessAffiliateAttribution.findMany({
      where: {
        OR: [{ affiliateId: affiliate.id }, { managerAffiliateId: affiliate.id }],
      },
      include: { business: { include: { license: true } } },
      orderBy: { attributedAt: 'desc' },
    })

    const clientsData = await Promise.all(
      attributions.map(async (attr) => {
        // Calculate revenue and earnings for this specific business
        const payments = await db.membershipPayment.aggregate({
          where: { businessId: attr.businessId },
          _sum: { amountMinor: true },
        })

        const earnings = await db.platformAffiliateEarning.aggregate({
          where: {
            beneficiaryAffiliateId: affiliate.id,
            membershipPayment: { businessId: attr.businessId },
          },
          _sum: { amountMinor: true },
        })

        const isDirect = attr.affiliateId === affiliate.id
        const effectiveRateBps = isDirect ? attr.affiliateRateBps : attr.managerShareBps

        return {
          id: attr.businessId,
          name: attr.business.name,
          licenseState: attr.business.license?.status ?? 'UNKNOWN',
          attributedAt: attr.attributedAt.toISOString(),
          directRateBps: effectiveRateBps ?? 0,
          membershipRevenueMinor: payments._sum.amountMinor ?? 0,
          cumulativeEarningsMinor: earnings._sum.amountMinor ?? 0,
        }
      }),
    )

    return { data: clientsData, nextCursor: null }
  }

  /**
   * Personal payout ledger: one row per commission-bearing event, with the rate frozen at the
   * time it was earned (PlatformAffiliateEarning.rateBps never changes after the fact, even if
   * the deal's live rate is edited later).
   */
  async getAffiliateLedger(
    user: { id: string; email: string },
    opts: { cursor?: string; limit?: number },
  ) {
    const affiliate = await this.getOrCreateForUser(user)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)

    const earnings = await db.platformAffiliateEarning.findMany({
      where: {
        beneficiaryAffiliateId: affiliate.id,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: {
        membershipPayment: { include: { business: { select: { id: true, name: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const hasMore = earnings.length > limit
    const page = hasMore ? earnings.slice(0, limit) : earnings
    const last = page[page.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null

    return {
      data: page.map((e) => ({
        id: e.id,
        businessId: e.membershipPayment.business.id,
        businessName: e.membershipPayment.business.name,
        clientPaymentMinor: e.membershipPayment.amountMinor,
        type: e.type,
        rateBps: e.rateBps,
        amountMinor: e.amountMinor,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor,
    }
  }

  // --- Money Flow ---

  async getMoneyFlowLedger(cursor?: string) {
    const limit = 50

    let aggregates = null

    // Fetch aggregate totals only on the first page
    if (!cursor) {
      const [revenueResult, earningsResult, payoutsResult] = await Promise.all([
        db.membershipPayment.aggregate({ _sum: { amountMinor: true } }),
        db.platformAffiliateEarning.groupBy({
          by: ['status', 'type'],
          _sum: { amountMinor: true },
        }),
        db.platformAffiliatePayout.groupBy({ by: ['status'], _sum: { totalAmountMinor: true } }),
      ])

      const membershipRevenueMinor = revenueResult._sum.amountMinor ?? 0

      let affiliateEarningsMinor = 0
      let managerOverridesMinor = 0
      let payableLiabilityMinor = 0

      for (const e of earningsResult) {
        if (e.type === 'DIRECT') affiliateEarningsMinor += e._sum.amountMinor ?? 0
        if (e.type === 'MANAGER_OVERRIDE') managerOverridesMinor += e._sum.amountMinor ?? 0
        if (e.status === 'PAYABLE') payableLiabilityMinor += e._sum.amountMinor ?? 0
      }

      const pendingPayoutTotalMinor =
        payoutsResult.find((p) => p.status === 'PENDING')?._sum.totalAmountMinor ?? 0
      const paidTotalMinor =
        payoutsResult.find((p) => p.status === 'PAID')?._sum.totalAmountMinor ?? 0

      aggregates = {
        membershipRevenueMinor,
        affiliateEarningsMinor,
        managerOverridesMinor,
        payableLiabilityMinor,
        pendingPayoutTotalMinor,
        paidTotalMinor,
      }
    }

    // Fetch payments list
    const payments = await db.membershipPayment.findMany({
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { settledAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        earnings: {
          include: {
            beneficiaryAffiliate: { select: { id: true, name: true } },
          },
        },
      },
    })

    let nextCursor: string | null = null
    if (payments.length > limit) {
      const nextItem = payments.pop()
      nextCursor = nextItem!.id
    }

    return {
      data: {
        aggregates,
        payments,
      },
      nextCursor,
    }
  }

  // --- Payouts ---

  async listPayouts() {
    const payouts = await db.platformAffiliatePayout.findMany({
      include: { affiliate: true, earnings: true },
      orderBy: { createdAt: 'desc' },
    })
    return { data: payouts, nextCursor: null }
  }

  async getPayableEarningsSummary() {
    // Find all earnings that are PAYABLE and not yet attached to a payout
    const earnings = await db.platformAffiliateEarning.findMany({
      where: {
        status: 'PAYABLE',
        payoutId: null,
      },
      include: {
        beneficiaryAffiliate: true,
      },
    })

    const summaryMap = new Map<
      string,
      { affiliateId: string; affiliateName: string; totalAmountMinor: number; earningIds: string[] }
    >()

    for (const e of earnings) {
      if (!summaryMap.has(e.beneficiaryAffiliateId)) {
        summaryMap.set(e.beneficiaryAffiliateId, {
          affiliateId: e.beneficiaryAffiliateId,
          affiliateName: e.beneficiaryAffiliate.name,
          totalAmountMinor: 0,
          earningIds: [],
        })
      }
      const entry = summaryMap.get(e.beneficiaryAffiliateId)!
      entry.totalAmountMinor += e.amountMinor
      entry.earningIds.push(e.id)
    }

    return { data: Array.from(summaryMap.values()) }
  }

  async createPayout(input: { affiliateId: string; earningIds: string[] }) {
    if (input.earningIds.length === 0) throw { statusCode: 400, message: 'No earnings provided' }

    return await db.$transaction(async (tx) => {
      // Every earning in the request, regardless of whether it's already claimed — lets a
      // duplicate submission of the exact same batch be recognized and replayed idempotently
      // (below) instead of 400ing or silently double-counting, even though there's no
      // idempotencyKey column on this model to check directly.
      const earnings = await tx.platformAffiliateEarning.findMany({
        where: { id: { in: input.earningIds } },
      })
      if (earnings.length !== input.earningIds.length) {
        throw { statusCode: 400, message: 'Some earnings were not found' }
      }

      const claimedPayoutIds = new Set(
        earnings.map((e) => e.payoutId).filter((id): id is string => !!id),
      )
      if (claimedPayoutIds.size === 1 && earnings.every((e) => e.payoutId)) {
        // The exact same set was already batched — replay the existing payout rather than error.
        const [existingId] = claimedPayoutIds
        const existing = await tx.platformAffiliatePayout.findUnique({ where: { id: existingId! } })
        if (existing) return { data: existing }
      }
      if (claimedPayoutIds.size > 0) {
        throw { statusCode: 409, message: 'Some earnings are already on a different payout' }
      }

      let totalAmountMinor = 0
      for (const earning of earnings) {
        if (earning.beneficiaryAffiliateId !== input.affiliateId) {
          throw { statusCode: 400, message: 'Earnings must belong to the specified affiliate' }
        }
        if (earning.status !== 'PAYABLE') {
          throw { statusCode: 400, message: 'All earnings must be in PAYABLE status' }
        }
        totalAmountMinor += earning.amountMinor
      }

      if (totalAmountMinor <= 0) {
        throw { statusCode: 400, message: 'Payout amount must be positive' }
      }

      const payout = await tx.platformAffiliatePayout.create({
        data: {
          affiliateId: input.affiliateId,
          totalAmountMinor,
          currency: 'USD',
          status: 'PENDING',
        },
      })

      // No unique constraint backs this claim (no idempotencyKey column on this model), so the
      // race guard is a conditional update instead: only earnings still unclaimed as of this
      // UPDATE's own row locks get linked (InnoDB's UPDATE...WHERE always locks/reads the latest
      // committed row, not this transaction's earlier snapshot). If a concurrent request already
      // claimed one of these earnings between our read above and here, fewer rows are affected
      // than requested and this whole batch aborts rather than leaving a partial, inconsistent
      // payout — the caller (or a retry) sees a clean 409 instead of silent double-counting.
      const claim = await tx.platformAffiliateEarning.updateMany({
        where: { id: { in: input.earningIds }, payoutId: null },
        data: { payoutId: payout.id },
      })
      if (claim.count !== input.earningIds.length) {
        throw {
          statusCode: 409,
          message: 'Some earnings were just claimed by a concurrent payout; retry',
        }
      }

      return { data: payout }
    })
  }

  async settlePayout(payoutId: string) {
    const payout = await finance.settlePlatformPayout(
      payoutId,
      `platform-payout:settle:${payoutId}`,
    )
    return { data: payout }
  }

  /**
   * Move a payout off PENDING (never transferred — releases its earnings back to PAYABLE) or off
   * PAID (the external transfer was reversed after the fact — reverses the settlement posting and
   * releases its earnings back to PAYABLE). Any other starting state is rejected.
   */
  async failPayout(payoutId: string, outcome: 'FAILED' | 'REVERSED', reason?: string) {
    const payout = await finance.failPlatformPayout(
      payoutId,
      `platform-payout:${outcome.toLowerCase()}:${payoutId}`,
      outcome,
      reason,
    )
    return { data: payout }
  }

  /**
   * Cross-checks membership revenue, generated earnings, and payouts against each other so a gap
   * in the pipeline (e.g. a payment with an ACTIVE attribution that somehow produced no earning)
   * shows up here instead of silently going unnoticed.
   */
  async getReconciliation() {
    const [revenue, earningsByStatusType, payoutsByStatus, reversedEarnings] = await Promise.all([
      db.membershipPayment.aggregate({ _sum: { amountMinor: true }, _count: true }),
      db.platformAffiliateEarning.groupBy({
        by: ['status', 'type'],
        _sum: { amountMinor: true },
        _count: true,
      }),
      db.platformAffiliatePayout.groupBy({
        by: ['status'],
        _sum: { totalAmountMinor: true },
        _count: true,
      }),
      db.platformAffiliateEarning.findMany({
        where: { status: 'REVERSED' },
        select: { id: true, beneficiaryAffiliateId: true, amountMinor: true },
      }),
    ])

    // Payments on a business that currently has an ACTIVE attribution but produced zero
    // PlatformAffiliateEarning rows — the exact class of gap this pass closes: a payment
    // processed before CommissionEngine was wired into the webhook, or a future bug in that
    // wiring, shows up here rather than silently vanishing. (An approximation, not an exact
    // point-in-time replay: a payment predating the current attribution but postdating a since-
    // invalidated one would also surface here — worth a human look either way.)
    const orphanedPayments = await db.membershipPayment.findMany({
      where: {
        earnings: { none: {} },
        business: { platformAffiliateAttribution: { status: 'ACTIVE' } },
      },
      select: { id: true, businessId: true, amountMinor: true, settledAt: true },
      take: 100,
    })

    // PAYABLE/PAID earnings not fully accounted for by any payout item — the sum a payout batch
    // should eventually cover.
    const unbatchedPayable = await db.platformAffiliateEarning.aggregate({
      where: { status: 'PAYABLE', payoutId: null },
      _sum: { amountMinor: true },
      _count: true,
    })

    return {
      data: {
        membershipRevenueMinor: revenue._sum.amountMinor ?? 0,
        membershipPaymentCount: revenue._count,
        earnings: earningsByStatusType.map((row) => ({
          status: row.status,
          type: row.type,
          amountMinor: row._sum.amountMinor ?? 0,
          count: row._count,
        })),
        payouts: payoutsByStatus.map((row) => ({
          status: row.status,
          totalAmountMinor: row._sum.totalAmountMinor ?? 0,
          count: row._count,
        })),
        unbatchedPayableMinor: unbatchedPayable._sum.amountMinor ?? 0,
        unbatchedPayableCount: unbatchedPayable._count,
        discrepancies: {
          orphanedPayments,
          reversedEarningsWithoutReason: reversedEarnings.length,
        },
      },
    }
  }
}
