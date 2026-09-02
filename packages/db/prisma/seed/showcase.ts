import { createCipheriv, createHash, randomBytes } from 'crypto'
import { db } from '../../src/client'
import type { LeadStage } from '@prisma/client'

// Seeds the material added since the original Riverside demo: a full CRM pipeline (one contact
// per stage), the Advertisement/AdRun model (dormant in real data until this ran), a connected
// platform, and the Inbox omni-stream tying all of it together — the exact four event sources
// InboxProjectionService now supports (CONTACT/ADVERTISEMENT/PAGE/INTEGRATION), so `pnpm db:seed`
// leaves a demo login with a genuinely populated Inbox instead of an empty one.

// Mirrors apps/server/src/lib/platforms/encrypt.ts#sealToken's exact key derivation (same env
// vars) so this seeded PlatformConnection's token can be unsealed by the real running server if a
// demo user ever clicks "sync" — duplicated, not imported, because packages/db must not depend on
// apps/server.
function sealDemoToken(plaintext: string) {
  const raw = process.env.PLATFORM_TOKEN_KEY
  const keyMaterial =
    raw && raw.length >= 32
      ? raw
      : (process.env.SESSION_SECRET ?? 'dev-session-secret-not-for-production')
  const key = createHash('sha256').update(keyMaterial).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`
}

function daysAgo(n: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  UNDECIDED: 'Undecided',
  INTERESTED: 'Interested',
  CLOSED: 'Closed',
  NOT_INTERESTED: 'Not interested',
}

export async function seedShowcase(opts: {
  businessId: string
  campaignId: string
  audienceId: string
  landingPage: { id: string; name: string }
  jane: { id: string; name: string }
  imageAssetId: string
}) {
  const { businessId, campaignId, audienceId, landingPage, jane, imageAssetId } = opts

  // ---------- CRM pipeline: one lead per stage, with real status-change history ----------
  const marcus = await upsertContact(
    businessId,
    'demo-contact-marcus',
    'Marcus Hill',
    'marcus.hill@example.com',
    '512-555-0143',
  )
  const sarah = await upsertContact(
    businessId,
    'demo-contact-sarah',
    'Sarah Chen',
    'sarah.chen@example.com',
    '512-555-0177',
  )
  const derek = await upsertContact(
    businessId,
    'demo-contact-derek',
    'Derek Owens',
    'derek.owens@example.com',
    '512-555-0118',
  )
  const priya = await upsertContact(
    businessId,
    'demo-contact-priya',
    'Priya Patel',
    'priya.patel@example.com',
    '512-555-0166',
  )
  const chris = await upsertContact(
    businessId,
    'demo-contact-chris',
    'Chris Nguyen',
    'chris.nguyen@example.com',
    '512-555-0129',
  )

  await stageHistory(businessId, jane.id, [{ from: 'NEW', to: 'INTERESTED', at: daysAgo(6) }])

  await upsertLead(businessId, 'demo-lead-marcus', marcus.id, 'NEW', { openSlot: 'OPEN' })

  await upsertLead(businessId, 'demo-lead-sarah', sarah.id, 'INTERESTED', { openSlot: 'OPEN' })
  await stageHistory(businessId, sarah.id, [
    { from: 'NEW', to: 'UNDECIDED', at: daysAgo(5) },
    { from: 'UNDECIDED', to: 'INTERESTED', at: daysAgo(2) },
  ])

  await upsertLead(businessId, 'demo-lead-derek', derek.id, 'INTERESTED', {
    openSlot: 'OPEN',
    estimatedValue: 620,
  })
  await stageHistory(businessId, derek.id, [
    { from: 'NEW', to: 'UNDECIDED', at: daysAgo(4) },
    { from: 'UNDECIDED', to: 'INTERESTED', at: daysAgo(1) },
  ])

  const priyaLead = await upsertLead(businessId, 'demo-lead-priya', priya.id, 'CLOSED', {
    openSlot: null,
    closedAt: daysAgo(0),
    estimatedValue: 940,
  })
  await stageHistory(businessId, priya.id, [
    { from: 'NEW', to: 'INTERESTED', at: daysAgo(7) },
    { from: 'INTERESTED', to: 'CLOSED', at: daysAgo(0) },
  ])
  await db.sale.upsert({
    where: { id: 'demo-sale-priya' },
    update: {},
    create: {
      id: 'demo-sale-priya',
      businessId,
      contactId: priya.id,
      leadId: priyaLead.id,
      amount: 940,
      date: daysAgo(0),
      productOrService: 'Full interior + ceramic coat',
      sourceType: 'MANUAL',
      idempotencyKey: 'demo-sale-priya',
    },
  })

  await upsertLead(businessId, 'demo-lead-chris', chris.id, 'NOT_INTERESTED', {
    openSlot: null,
    closedAt: daysAgo(1),
  })
  await stageHistory(businessId, chris.id, [
    { from: 'INTERESTED', to: 'NOT_INTERESTED', at: daysAgo(1) },
  ])

  // A second real communication channel alongside Jane's email — gives the Contact-thread bubble
  // rendering an SMS example, not just email.
  const sarahText = await db.message.upsert({
    where: { id: 'demo-message-sarah-text' },
    update: {},
    create: {
      id: 'demo-message-sarah-text',
      businessId,
      channel: 'TEXT',
      body: 'Are you still good for Thursday?',
      audienceId,
      status: 'SENT',
      sentAt: daysAgo(2, 14),
    },
  })
  await db.interaction.upsert({
    where: { id: 'demo-interaction-sarah-text' },
    update: {},
    create: {
      id: 'demo-interaction-sarah-text',
      businessId,
      contactId: sarah.id,
      type: 'TEXT_SENT',
      sourceType: 'MESSAGE',
      sourceMessageId: sarahText.id,
      occurredAt: daysAgo(2, 14),
    },
  })

  // ---------- Advertisement / AdRun — the declarative model, unreferenced by any seed until now ----------
  const advertisement = await db.advertisement.upsert({
    where: { id: 'demo-advertisement-summer' },
    update: { name: 'Summer Detail Booking Ad' },
    create: {
      id: 'demo-advertisement-summer',
      businessId,
      name: 'Summer Detail Booking Ad',
      assets: { create: [{ assetId: imageAssetId }] },
    },
  })

  const metaRun = await db.adRun.upsert({
    where: { id: 'demo-adrun-meta' },
    update: {},
    create: {
      id: 'demo-adrun-meta',
      advertisementId: advertisement.id,
      platform: 'META',
      status: 'ACTIVE',
      budget: 75,
      startDate: daysAgo(10),
      externalCampaignId: 'demo_ext_campaign_1',
      externalAdSetId: 'demo_ext_adset_1',
      externalAdId: 'demo_ext_ad_1',
      spend: 612.4,
      impressions: 28900,
      clicks: 540,
      conversions: 19,
      country: 'US',
      destinationLandingPageId: landingPage.id,
    },
  })
  await db.campaignAdRun.upsert({
    where: { campaignId_adRunId: { campaignId, adRunId: metaRun.id } },
    update: {},
    create: { campaignId, adRunId: metaRun.id },
  })

  await db.adRun.upsert({
    where: { id: 'demo-adrun-google' },
    update: {},
    create: {
      id: 'demo-adrun-google',
      advertisementId: advertisement.id,
      platform: 'GOOGLE',
      status: 'PENDING',
      budget: 40,
      country: 'US',
      destinationLandingPageId: landingPage.id,
    },
  })

  // ---------- Platform connection ----------
  await db.platformConnection.upsert({
    where: { businessId_platform: { businessId, platform: 'META' } },
    update: {},
    create: {
      businessId,
      platform: 'META',
      status: 'CONNECTED',
      accessTokenEnc: sealDemoToken('demo-access-token'),
      adAccountId: 'act_demo123',
      accountName: 'Riverside Auto Detailing Ads',
      currency: 'USD',
      timezone: 'America/Chicago',
      pageId: 'demo_page_1',
    },
  })

  // ---------- Inbox: the omni stream tying all of the above together ----------
  const janeThread = await upsertContactThread(businessId, jane.id, jane.name, null)
  await upsertMessage(
    'demo-inbox-jane-1',
    janeThread.id,
    'Lead status changed',
    'Moved from New to Interested.',
    daysAgo(6),
  )

  const marcusThread = await upsertContactThread(businessId, marcus.id, marcus.name, null)
  await upsertMessage(
    'demo-inbox-marcus-1',
    marcusThread.id,
    'Form submitted',
    'Submitted Book a Detail.',
    daysAgo(0, 8),
  )

  const sarahThread = await upsertContactThread(businessId, sarah.id, sarah.name, daysAgo(0))
  await upsertMessage(
    'demo-inbox-sarah-1',
    sarahThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.NEW} to ${STAGE_LABEL.UNDECIDED}.`,
    daysAgo(5),
  )
  await upsertMessage(
    'demo-inbox-sarah-2',
    sarahThread.id,
    'Page viewed',
    `Viewed ${landingPage.name}.`,
    daysAgo(3, 10),
  )
  await upsertMessage(
    'demo-inbox-sarah-3',
    sarahThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.UNDECIDED} to ${STAGE_LABEL.INTERESTED}.`,
    daysAgo(2),
  )

  const derekThread = await upsertContactThread(businessId, derek.id, derek.name, daysAgo(0))
  await upsertMessage(
    'demo-inbox-derek-1',
    derekThread.id,
    'Form submitted',
    'Submitted Book a Detail.',
    daysAgo(4, 9),
  )
  await upsertMessage(
    'demo-inbox-derek-2',
    derekThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.NEW} to ${STAGE_LABEL.UNDECIDED}.`,
    daysAgo(4),
  )
  await upsertMessage(
    'demo-inbox-derek-3',
    derekThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.UNDECIDED} to ${STAGE_LABEL.INTERESTED}.`,
    daysAgo(1),
  )

  const priyaThread = await upsertContactThread(businessId, priya.id, priya.name, null)
  await upsertMessage(
    'demo-inbox-priya-1',
    priyaThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.NEW} to ${STAGE_LABEL.INTERESTED}.`,
    daysAgo(7),
  )
  await upsertMessage(
    'demo-inbox-priya-2',
    priyaThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.INTERESTED} to ${STAGE_LABEL.CLOSED}.`,
    daysAgo(0),
  )

  const chrisThread = await upsertContactThread(businessId, chris.id, chris.name, daysAgo(0))
  await upsertMessage(
    'demo-inbox-chris-1',
    chrisThread.id,
    'Lead status changed',
    `Moved from ${STAGE_LABEL.INTERESTED} to ${STAGE_LABEL.NOT_INTERESTED}.`,
    daysAgo(1),
  )

  const adThread = await upsertAdvertisementThread(
    businessId,
    advertisement.id,
    'META',
    `META · ${advertisement.name}`,
    null,
  )
  await upsertMessage(
    'demo-inbox-ad-1',
    adThread.id,
    'Ad budget updated',
    '$50.00/day → $75.00/day',
    daysAgo(6),
  )
  await upsertMessage(
    'demo-inbox-ad-2',
    adThread.id,
    'New ad version is live',
    'Revision 2 replaced revision 1. Previous version has stopped.',
    daysAgo(3),
  )
  await upsertMessage(
    'demo-inbox-ad-3',
    adThread.id,
    'META rejected this ad',
    'Missing disclaimer. Review the issue and fix it.',
    daysAgo(0, 8),
  )

  const pageThread = await upsertPageThread(businessId, landingPage.id, landingPage.name, null)
  await upsertMessage(
    'demo-inbox-page-1',
    pageThread.id,
    'New submission',
    `New submission from ${derek.name}.`,
    daysAgo(4, 9),
  )
  await upsertMessage(
    'demo-inbox-page-2',
    pageThread.id,
    'New submission',
    `New submission from ${marcus.name}.`,
    daysAgo(0, 8),
  )

  const integrationThread = await upsertIntegrationThread(businessId, 'META', daysAgo(0))
  await upsertMessage(
    'demo-inbox-integration-1',
    integrationThread.id,
    'META connected',
    'META is connected and ready.',
    daysAgo(10),
  )
}

async function upsertContact(
  businessId: string,
  id: string,
  name: string,
  email: string,
  phone: string,
) {
  return db.contact.upsert({
    where: { id },
    update: {},
    create: { id, businessId, name, email, phone, source: 'website' },
  })
}

async function upsertLead(
  businessId: string,
  id: string,
  contactId: string,
  stage: LeadStage,
  opts: { openSlot: 'OPEN' | null; closedAt?: Date; estimatedValue?: number },
) {
  return db.lead.upsert({
    where: { id },
    update: {},
    create: {
      id,
      businessId,
      contactId,
      stage,
      sourceType: 'MANUAL',
      openSlot: opts.openSlot,
      closedAt: opts.closedAt,
      estimatedValue: opts.estimatedValue,
    },
  })
}

async function stageHistory(
  businessId: string,
  contactId: string,
  steps: { from: string; to: string; at: Date }[],
) {
  for (const [i, step] of steps.entries()) {
    await db.interaction.upsert({
      where: { id: `demo-status-${contactId}-${i}` },
      update: {},
      create: {
        id: `demo-status-${contactId}-${i}`,
        businessId,
        contactId,
        type: 'STATUS_CHANGE',
        occurredAt: step.at,
        metadata: { from: step.from, to: step.to },
      },
    })
  }
}

async function upsertContactThread(
  businessId: string,
  contactId: string,
  subject: string,
  lastReadAt: Date | null,
) {
  return db.inboxThread.upsert({
    where: { contactId },
    update: { subject, lastReadAt },
    create: { businessId, type: 'CONTACT', contactId, subject, lastReadAt },
  })
}

async function upsertAdvertisementThread(
  businessId: string,
  advertisementId: string,
  platform: string,
  subject: string,
  lastReadAt: Date | null,
) {
  return db.inboxThread.upsert({
    where: { advertisementId_platform: { advertisementId, platform } },
    update: { subject, lastReadAt },
    create: { businessId, type: 'ADVERTISEMENT', advertisementId, platform, subject, lastReadAt },
  })
}

async function upsertPageThread(
  businessId: string,
  landingPageId: string,
  subject: string,
  lastReadAt: Date | null,
) {
  return db.inboxThread.upsert({
    where: { landingPageId },
    update: { subject, lastReadAt },
    create: { businessId, type: 'PAGE', landingPageId, subject, lastReadAt },
  })
}

async function upsertIntegrationThread(
  businessId: string,
  integrationPlatform: string,
  lastReadAt: Date | null,
) {
  return db.inboxThread.upsert({
    where: { businessId_integrationPlatform: { businessId, integrationPlatform } },
    update: { subject: integrationPlatform, lastReadAt },
    create: {
      businessId,
      type: 'INTEGRATION',
      integrationPlatform,
      subject: integrationPlatform,
      lastReadAt,
    },
  })
}

async function upsertMessage(
  id: string,
  threadId: string,
  subject: string,
  body: string,
  at: Date,
) {
  return db.inboxMessage.upsert({
    where: { id },
    update: {},
    create: { id, threadId, kind: 'SYSTEM', direction: 'INTERNAL', subject, body, createdAt: at },
  })
}
