import { db } from '../../src/client'
import type { User } from '@prisma/client'

export async function seedAffiliates(opts: {
  riversideId: string
  oakId: string
  landingPageId: string
  users: {
    jordan: User
    casey: User
    riley: User
    taylor: User
    oakSam: User
  }
}) {
  const { riversideId, oakId, landingPageId, users } = opts

  const fieldClass = await db.affiliateClass.upsert({
    where: { id: 'demo-affiliate-class-field' },
    update: {},
    create: {
      id: 'demo-affiliate-class-field',
      businessId: riversideId,
      name: 'Field Rep',
      maxAffiliateRateBps: 5000,
      maxManagerShareBps: 5000,
    },
  })
  const standardDeal = await db.affiliateDeal.upsert({
    where: { id: 'demo-affiliate-deal-standard' },
    update: {},
    create: {
      id: 'demo-affiliate-deal-standard',
      businessId: riversideId,
      classId: fieldClass.id,
      name: 'Standard 10',
      affiliateRateBps: 1000,
      managerShareBps: 2000,
      payoutCadence: 'MANUAL',
    },
  })
  const weeklyDeal = await db.affiliateDeal.upsert({
    where: { id: 'demo-affiliate-deal-weekly' },
    update: {},
    create: {
      id: 'demo-affiliate-deal-weekly',
      businessId: riversideId,
      classId: fieldClass.id,
      name: 'Weekly 8',
      affiliateRateBps: 800,
      managerShareBps: 0,
      payoutCadence: 'WEEKLY',
      payoutThresholdMinor: 5000,
    },
  })
  const fixedDeal = await db.affiliateDeal.upsert({
    where: { id: 'demo-affiliate-deal-fixed' },
    update: {},
    create: {
      id: 'demo-affiliate-deal-fixed',
      businessId: riversideId,
      classId: fieldClass.id,
      name: 'Flat 25',
      commissionRuleType: 'FIXED',
      fixedAmountMinor: 2500,
      managerShareBps: 0,
      payoutCadence: 'MANUAL',
    },
  })
  await db.affiliateClass.update({
    where: { id: fieldClass.id },
    data: { defaultDealId: standardDeal.id },
  })

  const jordan = await upsertAffiliate({
    id: 'demo-affiliate-jordan',
    businessId: riversideId,
    name: 'Jordan Referrer',
    email: 'affiliate@loopie.app',
    referralCode: 'jordan10',
    classId: fieldClass.id,
    dealId: standardDeal.id,
    userId: users.jordan.id,
    destinationLandingPageId: landingPageId,
  })
  const casey = await upsertAffiliate({
    id: 'demo-affiliate-casey',
    businessId: riversideId,
    name: 'Casey Manager',
    email: 'manager@loopie.app',
    referralCode: 'casey',
    classId: fieldClass.id,
    dealId: standardDeal.id,
    userId: users.casey.id,
    destinationLandingPageId: landingPageId,
  })
  await upsertAffiliate({
    id: 'demo-affiliate-riley',
    businessId: riversideId,
    name: 'Riley Downline',
    email: 'downline@loopie.app',
    referralCode: 'riley',
    classId: fieldClass.id,
    dealId: standardDeal.id,
    userId: users.riley.id,
    managerId: casey.id,
    destinationLandingPageId: landingPageId,
  })
  await upsertAffiliate({
    id: 'demo-affiliate-taylor',
    businessId: riversideId,
    name: 'Taylor Paused',
    email: 'paused-affiliate@loopie.app',
    referralCode: 'taylor',
    classId: fieldClass.id,
    dealId: weeklyDeal.id,
    userId: users.taylor.id,
    destinationLandingPageId: landingPageId,
    paused: true,
  })
  await upsertAffiliate({
    id: 'demo-affiliate-maya',
    businessId: riversideId,
    name: 'Maya No-Login',
    email: 'maya@example.com',
    referralCode: 'maya25',
    classId: fieldClass.id,
    dealId: fixedDeal.id,
    destinationLandingPageId: landingPageId,
  })

  const oakClass = await db.affiliateClass.upsert({
    where: { id: 'demo-oak-class-field' },
    update: {},
    create: {
      id: 'demo-oak-class-field',
      businessId: oakId,
      name: 'Partners',
      maxAffiliateRateBps: 3000,
      maxManagerShareBps: 2000,
    },
  })
  const oakDeal = await db.affiliateDeal.upsert({
    where: { id: 'demo-oak-deal-standard' },
    update: {},
    create: {
      id: 'demo-oak-deal-standard',
      businessId: oakId,
      classId: oakClass.id,
      name: 'Partner 12',
      affiliateRateBps: 1200,
      managerShareBps: 0,
      payoutCadence: 'MONTHLY',
    },
  })
  await db.affiliateClass.update({
    where: { id: oakClass.id },
    data: { defaultDealId: oakDeal.id },
  })
  await upsertAffiliate({
    id: 'demo-affiliate-oak-sam',
    businessId: oakId,
    name: 'Sam Oak',
    email: 'oak-affiliate@loopie.app',
    referralCode: 'oaksam',
    classId: oakClass.id,
    dealId: oakDeal.id,
    userId: users.oakSam.id,
    destinationUrl: 'https://oakstreet.example.com',
  })

  return { jordan }
}

async function upsertAffiliate(data: {
  id: string
  businessId: string
  name: string
  email: string
  referralCode: string
  classId: string
  dealId: string
  userId?: string
  managerId?: string
  destinationLandingPageId?: string
  destinationUrl?: string
  paused?: boolean
}) {
  const pausedAt = data.paused ? new Date('2026-06-01T00:00:00.000Z') : null
  return db.affiliate.upsert({
    where: { id: data.id },
    update: {
      classId: data.classId,
      dealId: data.dealId,
      userId: data.userId ?? null,
      managerId: data.managerId ?? null,
      destinationLandingPageId: data.destinationLandingPageId ?? null,
      destinationUrl: data.destinationUrl ?? null,
      isActive: !data.paused,
      pausedAt,
    },
    create: {
      id: data.id,
      businessId: data.businessId,
      name: data.name,
      email: data.email,
      referralCode: data.referralCode,
      classId: data.classId,
      dealId: data.dealId,
      userId: data.userId,
      managerId: data.managerId,
      destinationLandingPageId: data.destinationLandingPageId,
      destinationUrl: data.destinationUrl,
      isActive: !data.paused,
      pausedAt,
    },
  })
}
