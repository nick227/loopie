import { db } from '../../src/client'
import type { User, UserRole } from '@prisma/client'

export const SEED_PASSWORD = 'password123'

export const RIVERSIDE_ID = 'demo-business'
export const OAK_ID = 'demo-business-oak'

export type SeedAccount = {
  email: string
  role: UserRole
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
    role: 'ADMIN',
    businessId: RIVERSIDE_ID,
    label: 'owner — campaigns, affiliates, billing',
    memberRole: 'OWNER',
    jobTitle: 'Founder',
    isFounder: true,
  },
  {
    email: 'shop@loopie.app',
    role: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'staff — campaigns/messages only',
    memberRole: 'MEMBER',
    jobTitle: 'Shop manager',
  },
  {
    email: 'marketer@loopie.app',
    role: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'second staff login',
    memberRole: 'MEMBER',
    jobTitle: 'Marketer',
  },
  {
    email: 'suspended@loopie.app',
    role: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'login returns 403',
    suspended: true,
    memberRole: 'MEMBER',
    jobTitle: 'Suspended staff',
  },
  {
    email: 'affiliate@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Jordan — independent field rep',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
  {
    email: 'manager@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Casey — manager with a downline',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate manager',
  },
  {
    email: 'downline@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Riley — reports to Casey',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
  {
    email: 'paused-affiliate@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Taylor — paused, cannot earn',
    memberRole: 'MEMBER',
    jobTitle: 'Affiliate',
  },
  {
    email: 'oak@loopie.app',
    role: 'ADMIN',
    businessId: OAK_ID,
    label: 'second-tenant owner',
    memberRole: 'OWNER',
    jobTitle: 'Founder',
    isFounder: true,
  },
  {
    email: 'oak-shop@loopie.app',
    role: 'USER',
    businessId: OAK_ID,
    label: 'second-tenant staff',
    memberRole: 'MEMBER',
    jobTitle: 'Staff',
  },
  {
    email: 'oak-affiliate@loopie.app',
    role: 'AFFILIATE',
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
      role: spec.role,
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
      role: spec.role,
      isVerified: true,
      suspendedAt,
    },
  })

  const memberRole = spec.memberRole ?? (spec.role === 'USER' ? 'MEMBER' : 'OWNER')
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
