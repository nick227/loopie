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
}

export const SEED_ACCOUNTS: SeedAccount[] = [
  {
    email: 'demo@loopie.app',
    role: 'ADMIN',
    businessId: RIVERSIDE_ID,
    label: 'owner — campaigns, affiliates, billing',
  },
  {
    email: 'shop@loopie.app',
    role: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'staff — campaigns/messages only',
  },
  {
    email: 'marketer@loopie.app',
    role: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'second staff login',
  },
  {
    email: 'suspended@loopie.app',
    role: 'USER',
    businessId: RIVERSIDE_ID,
    label: 'login returns 403',
    suspended: true,
  },
  {
    email: 'affiliate@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Jordan — independent field rep',
  },
  {
    email: 'manager@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Casey — manager with a downline',
  },
  {
    email: 'downline@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Riley — reports to Casey',
  },
  {
    email: 'paused-affiliate@loopie.app',
    role: 'AFFILIATE',
    businessId: RIVERSIDE_ID,
    label: 'Taylor — paused, cannot earn',
  },
  { email: 'oak@loopie.app', role: 'ADMIN', businessId: OAK_ID, label: 'second-tenant owner' },
  { email: 'oak-shop@loopie.app', role: 'USER', businessId: OAK_ID, label: 'second-tenant staff' },
  {
    email: 'oak-affiliate@loopie.app',
    role: 'AFFILIATE',
    businessId: OAK_ID,
    label: 'Sam — other-tenant affiliate',
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
  return db.user.upsert({
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
}

function mustUser(users: Record<string, User>, email: string): User {
  const user = users[email]
  if (!user) throw new Error(`seed user ${email} was not created`)
  return user
}
