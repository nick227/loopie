import { db } from '../../src/client'
import type { User, UserPlatformRole } from '@prisma/client'

export const SEED_PASSWORD = 'password123'

export const RIVERSIDE_ID = 'demo-business'
export const OAK_ID = 'demo-business-oak'

export type SeedAccount = {
  email: string
  platformRole: UserPlatformRole
  businessId: string
  label: string
  suspended?: boolean
  /** Company access role. Defaults: ADMIN → OWNER+founder, USER → MEMBER, AFFILIATE → OWNER. */
  memberRole?: 'OWNER' | 'MEMBER'
  jobTitle?: string
  isFounder?: boolean
}

export const SEED_ACCOUNTS: SeedAccount[] = [
  {
    email: 'demo@loopie.app',
    platformRole: 'SITE_ADMIN',
    businessId: RIVERSIDE_ID,
    label: 'owner — campaigns, affiliates, billing',
    memberRole: 'OWNER',
    jobTitle: 'Founder',
    isFounder: true,
  },
  {
    email: 'shop@loopie.app',
    platformRole: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'staff — campaigns/messages only',
    memberRole: 'MEMBER',
    jobTitle: 'Shop manager',
  },
  {
    email: 'marketer@loopie.app',
    platformRole: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'second staff login',
    memberRole: 'MEMBER',
    jobTitle: 'Marketer',
  },
  {
    email: 'suspended@loopie.app',
    platformRole: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'login returns 403',
    suspended: true,
    memberRole: 'MEMBER',
    jobTitle: 'Suspended staff',
  },
  {
    email: 'affiliate@loopie.app',
    platformRole: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Jordan — independent field rep',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
  {
    email: 'manager@loopie.app',
    platformRole: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Casey — manager with a downline',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate manager',
  },
  {
    email: 'downline@loopie.app',
    platformRole: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Riley — reports to Casey',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
  {
    email: 'paused-affiliate@loopie.app',
    platformRole: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Taylor — paused, cannot earn',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
  {
    email: 'oak@loopie.app',
    platformRole: 'SITE_ADMIN',
    businessId: OAK_ID,
    label: 'second-tenant owner',
    memberRole: 'OWNER',
    jobTitle: 'Founder',
    isFounder: true,
  },
  {
    email: 'oak-shop@loopie.app',
    platformRole: 'USER',
    businessId: OAK_ID,
    label: 'second-tenant staff',
    memberRole: 'MEMBER',
    jobTitle: 'Staff',
  },
  {
    email: 'oak-affiliate@loopie.app',
    platformRole: 'AFFILIATE',
    businessId: OAK_ID,
    label: 'Sam — other-tenant affiliate',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
]

export async function seedBusinessesAndUsers(passwordHash: string) {
  // Seeded as already-established businesses, not brand-new signups — identityCompletedAt set so
  // demo logins and the e2e suite land straight on Inbox instead of hitting the First-Login setup
  // gate (docs/strategy/03-product-principles.md) that a real new account would see once.
  const riverside = await db.business.upsert({
    where: { id: RIVERSIDE_ID },
    update: {},
    create: {
      id: RIVERSIDE_ID,
      name: 'Riverside Auto Detailing',
      slug: 'riverside-auto-detailing',
      location: 'Riverside, CA',
      industry: 'Auto Detailing',
      targetAudience: 'Car owners in the Riverside area who want a professional, convenient detail',
      identityCompletedAt: new Date(),
    },
  })
  const oak = await db.business.upsert({
    where: { id: OAK_ID },
    update: {},
    create: {
      id: OAK_ID,
      name: 'Oak Street Bakery',
      slug: 'oak-street-bakery',
      location: 'Portland, OR',
      industry: 'Bakery & Cafe',
      targetAudience: 'Neighborhood regulars and local event/catering customers',
      identityCompletedAt: new Date(),
    },
  })

  // Seed active licenses (100 years for dev environments)
  const endsAt = new Date()
  endsAt.setFullYear(endsAt.getFullYear() + 100)

  await db.businessLicense.upsert({
    where: { businessId: RIVERSIDE_ID },
    update: { status: 'ACTIVE', endsAt, source: 'MANUAL' },
    create: {
      businessId: RIVERSIDE_ID,
      status: 'ACTIVE',
      endsAt,
      source: 'MANUAL',
      note: 'Dev Seed',
    },
  })

  await db.businessLicense.upsert({
    where: { businessId: OAK_ID },
    update: { status: 'ACTIVE', endsAt, source: 'MANUAL' },
    create: { businessId: OAK_ID, status: 'ACTIVE', endsAt, source: 'MANUAL', note: 'Dev Seed' },
  })

  const users: Record<string, User> = {}
  for (const spec of SEED_ACCOUNTS) {
    users[spec.email] = await upsertUser(spec, passwordHash)
  }

  return {
    riverside,
    oak,
    users: {
      jordan: mustUser(users, 'affiliate@loopie.app'),
      casey: mustUser(users, 'manager@loopie.app'),
      riley: mustUser(users, 'downline@loopie.app'),
      taylor: mustUser(users, 'paused-affiliate@loopie.app'),
      oakSam: mustUser(users, 'oak-affiliate@loopie.app'),
    },
  }
}

async function upsertUser(spec: SeedAccount, passwordHash: string) {
  const suspendedAt = spec.suspended ? new Date('2026-01-01T00:00:00.000Z') : null
  const user = await db.user.upsert({
    where: { email: spec.email },
    update: {
      platformRole: spec.platformRole,
      passwordHash,
      businessId: spec.businessId,
      suspendedAt,
      deletedAt: null,
      isVerified: true,
    },
    create: {
      email: spec.email,
      passwordHash,
      businessId: spec.businessId,
      platformRole: spec.platformRole,
      isVerified: true,
      suspendedAt,
    },
  })

  const memberRole = spec.memberRole ?? (spec.platformRole === 'USER' ? 'MEMBER' : 'OWNER')
  const isFounder = spec.isFounder ?? false
  await db.businessMembership.upsert({
    where: { userId_businessId: { userId: user.id, businessId: spec.businessId } },
    update: {
      role: memberRole,
      jobTitle: spec.jobTitle ?? null,
      isFounder,
    },
    create: {
      userId: user.id,
      businessId: spec.businessId,
      role: memberRole,
      jobTitle: spec.jobTitle ?? null,
      isFounder,
    },
  })

  return user
}

function mustUser(users: Record<string, User>, email: string): User {
  const user = users[email]
  if (!user) throw new Error(`seed user ${email} was not created`)
  return user
}
