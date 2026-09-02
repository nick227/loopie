import { db } from '../../src/client'
import type { Prisma } from '@prisma/client'
import { RIVERSIDE_ID, OAK_ID } from './accounts'

// Populates the two things a fresh `pnpm db:seed` never touched: Business public-profile fields
// (description/contact/hours/logo/gallery/social — everything BusinessProfilePage.tsx renders)
// and the River social feed (posts/follows/reactions/comments). Neither existed anywhere in the
// seed before this file — see the seed-data-audit conversation. Deliberately kept much smaller
// than showcase.ts: the goal is a convincing small network, not exhaustive fixture coverage.
//
// Riverside/Oak are the existing demo-login businesses (see accounts.ts); three more are added
// here purely as River peers for them to follow/be followed by/react to — they don't need logins,
// since every River model keys off businessId, not userId. All ids/dates are deterministic
// (daysAgo(n) off "now," same pattern as showcase.ts's own helper) so re-seeding is stable.

const NORTHSHORE_ID = 'demo-business-northshore'
const COPPERLINE_ID = 'demo-business-copperline'
const FERNWOOD_ID = 'demo-business-fernwood'

function daysAgo(n: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

export async function seedRiverAndProfiles() {
  await populateProfiles()
  const newBusinessIds = await seedPeerBusinesses()
  const { publishedPageVersionId } = await requirePublishedPage('demo-landing-page-raw-stories')
  const publishedAdVersionId = await ensurePublishedAdVersion('demo-advertisement-summer')

  await seedPosts(publishedPageVersionId, publishedAdVersionId)
  await seedFollows()
  await seedReactions()
  await seedComments()

  return { businessIds: [RIVERSIDE_ID, OAK_ID, ...newBusinessIds] }
}

// ---------- Profile fields for the two existing demo businesses ----------

async function populateProfiles() {
  await db.business.update({
    where: { id: RIVERSIDE_ID },
    data: {
      description:
        'Mobile auto detailing for people who care about their car but don’t have a weekend to spend on it. We come to you — driveway, office lot, wherever the car already is.',
      phone: '512-555-0100',
      email: 'hello@riversideautodetailing.example',
      hours: 'Mon–Sat, 8am–6pm · Closed Sundays',
      logoUrl: 'https://picsum.photos/id/1071/200/200',
      galleryImageUrls: [
        'https://picsum.photos/id/1015/1080/1350',
        'https://picsum.photos/id/1011/1080/1080',
        'https://picsum.photos/id/1016/1080/1920',
      ] as Prisma.InputJsonValue,
      socialProfiles: [
        { platform: 'Instagram', url: 'https://instagram.com/riversideautodetailing' },
        { platform: 'Facebook', url: 'https://facebook.com/riversideautodetailing' },
      ] as Prisma.InputJsonValue,
    },
  })

  await db.business.update({
    where: { id: OAK_ID },
    data: {
      description:
        'A neighborhood bakery and cafe — naturally leavened bread, pastry, and coffee, plus catering for local events. Everything baked the same morning it’s sold.',
      phone: '503-555-0166',
      email: 'orders@oakstreetbakery.example',
      hours: 'Tue–Sun, 7am–2pm · Closed Mondays',
      logoUrl: 'https://picsum.photos/id/292/200/200',
      galleryImageUrls: [
        'https://picsum.photos/id/431/1080/1080',
        'https://picsum.photos/id/365/1080/1080',
      ] as Prisma.InputJsonValue,
      socialProfiles: [
        { platform: 'Instagram', url: 'https://instagram.com/oakstreetbakery' },
      ] as Prisma.InputJsonValue,
    },
  })
}

// ---------- Three new businesses, River peers only (no login users) ----------

async function seedPeerBusinesses() {
  await db.business.upsert({
    where: { id: NORTHSHORE_ID },
    update: {},
    create: {
      id: NORTHSHORE_ID,
      name: 'Northshore Landscaping',
      slug: 'northshore-landscaping',
      location: 'Austin, TX',
      industry: 'Landscaping & Lawn Care',
      targetAudience: 'Homeowners who want their yard handled without micromanaging it',
      identityCompletedAt: daysAgo(120),
      description:
        'Full-service landscaping — design, install, and seasonal maintenance for Austin-area homes and small commercial properties.',
      phone: '512-555-0134',
      email: 'crew@northshorelandscaping.example',
      hours: 'Mon–Fri, 7am–5pm',
      logoUrl: 'https://picsum.photos/id/28/200/200',
      galleryImageUrls: [
        'https://picsum.photos/id/29/1080/1080',
        'https://picsum.photos/id/1043/1080/1080',
      ] as Prisma.InputJsonValue,
      socialProfiles: [
        { platform: 'Instagram', url: 'https://instagram.com/northshorelandscaping' },
      ] as Prisma.InputJsonValue,
    },
  })

  await db.business.upsert({
    where: { id: COPPERLINE_ID },
    update: {},
    create: {
      id: COPPERLINE_ID,
      name: 'Copperline Roofing',
      slug: 'copperline-roofing',
      location: 'Denver, CO',
      industry: 'Roofing & Exterior',
      targetAudience: 'Homeowners needing roof repair, replacement, or storm damage assessment',
      identityCompletedAt: daysAgo(200),
      description:
        'Licensed roofing contractor serving the Denver metro — repair, full replacement, and free storm damage inspections.',
      phone: '303-555-0121',
      email: 'office@copperlineroofing.example',
      hours: 'Mon–Fri, 7am–6pm · Emergency calls anytime',
      logoUrl: 'https://picsum.photos/id/1076/200/200',
      galleryImageUrls: [
        'https://picsum.photos/id/1080/1080/1080',
        'https://picsum.photos/id/1084/1080/1080',
      ] as Prisma.InputJsonValue,
      socialProfiles: [
        { platform: 'Facebook', url: 'https://facebook.com/copperlineroofing' },
      ] as Prisma.InputJsonValue,
    },
  })

  await db.business.upsert({
    where: { id: FERNWOOD_ID },
    update: {},
    create: {
      id: FERNWOOD_ID,
      name: 'Fernwood Floral Co.',
      slug: 'fernwood-floral',
      location: 'Seattle, WA',
      industry: 'Florist & Event Design',
      targetAudience: 'Couples planning weddings and locals ordering everyday arrangements',
      identityCompletedAt: daysAgo(90),
      description:
        'A Seattle flower studio — weekly walk-in arrangements, and full floral design for weddings and events.',
      phone: '206-555-0148',
      email: 'studio@fernwoodfloral.example',
      hours: 'Tue–Sat, 9am–5pm',
      logoUrl: 'https://picsum.photos/id/106/200/200',
      galleryImageUrls: [
        'https://picsum.photos/id/1080/1080/1350',
        'https://picsum.photos/id/1074/1080/1080',
      ] as Prisma.InputJsonValue,
      socialProfiles: [
        { platform: 'Instagram', url: 'https://instagram.com/fernwoodfloral' },
      ] as Prisma.InputJsonValue,
    },
  })

  // One Asset per new business so an IMAGE-type River post has something real to reference.
  await db.asset.upsert({
    where: { id: 'demo-asset-northshore' },
    update: {},
    create: {
      id: 'demo-asset-northshore',
      businessId: NORTHSHORE_ID,
      type: 'IMAGE',
      name: 'Backyard renovation, week three',
      url: 'https://picsum.photos/id/1043/1080/1080',
      mimeType: 'image/jpeg',
      widthPx: 1080,
      heightPx: 1080,
    },
  })
  await db.asset.upsert({
    where: { id: 'demo-asset-copperline' },
    update: {},
    create: {
      id: 'demo-asset-copperline',
      businessId: COPPERLINE_ID,
      type: 'IMAGE',
      name: 'New roof, one day',
      url: 'https://picsum.photos/id/1080/1080/1080',
      mimeType: 'image/jpeg',
      widthPx: 1080,
      heightPx: 1080,
    },
  })
  await db.asset.upsert({
    where: { id: 'demo-asset-fernwood' },
    update: {},
    create: {
      id: 'demo-asset-fernwood',
      businessId: FERNWOOD_ID,
      type: 'IMAGE',
      name: 'Walk-in case, local dahlias',
      url: 'https://picsum.photos/id/1074/1080/1080',
      mimeType: 'image/jpeg',
      widthPx: 1080,
      heightPx: 1080,
    },
  })
  await db.asset.upsert({
    where: { id: 'demo-asset-oak-pastry' },
    update: {},
    create: {
      id: 'demo-asset-oak-pastry',
      businessId: OAK_ID,
      type: 'IMAGE',
      name: "Today's pastry case",
      url: 'https://picsum.photos/id/365/1080/1080',
      mimeType: 'image/jpeg',
      widthPx: 1080,
      heightPx: 1080,
    },
  })

  return [NORTHSHORE_ID, COPPERLINE_ID, FERNWOOD_ID]
}

// ---------- Prerequisites for the PAGE-share and AD-share posts ----------

// riverside.ts's own seedCapture() sets LandingPage.publishedVersionId via a follow-up update
// whose return value it never captures back into the `landingPage` object it returns — so a
// fresh read here is the only reliable way to get the real, current publishedVersionId.
async function requirePublishedPage(landingPageId: string) {
  const page = await db.landingPage.findUniqueOrThrow({ where: { id: landingPageId } })
  if (!page.publishedVersionId) {
    throw new Error(`seedRiverAndProfiles: ${landingPageId} has no publishedVersionId to share`)
  }
  return { publishedPageVersionId: page.publishedVersionId }
}

// showcase.ts creates the Advertisement itself but never publishes it (no PublishedAdvertisementVersion
// existed anywhere in the seed) — mirrors AdvertisementService.publish()'s exact creativeSnapshot shape
// so the AD-type River post renders the same way a real publish would.
async function ensurePublishedAdVersion(advertisementId: string) {
  const advertisement = await db.advertisement.findUniqueOrThrow({
    where: { id: advertisementId },
    include: { assets: { orderBy: { id: 'asc' } } },
  })
  await db.advertisement.update({
    where: { id: advertisementId },
    data: {
      primaryText:
        'Book your detail online in under a minute. We come to you — no drop-off, no waiting.',
      ctaLabel: 'Book Now',
      destinationUrl: 'https://riversideauto.example.com/offer',
    },
  })

  const existing = await db.publishedAdvertisementVersion.findFirst({
    where: { advertisementId, archivedAt: null },
    orderBy: { version: 'desc' },
  })
  if (existing) return existing.id

  const assetIds = advertisement.assets.map((a) => a.assetId)
  const version = await db.publishedAdvertisementVersion.create({
    data: {
      id: 'demo-pubad-summer-v1',
      advertisementId,
      version: 1,
      creativeSnapshot: {
        accessibleLabel: null,
        assets: assetIds,
        primaryText:
          'Book your detail online in under a minute. We come to you — no drop-off, no waiting.',
        ctaLabel: 'Book Now',
        clickBehavior: 'URL',
        destinationUrl: 'https://riversideauto.example.com/offer',
        dimensions: null,
      } as Prisma.InputJsonValue,
      assetIds: assetIds as Prisma.InputJsonValue,
      clickBehavior: 'URL',
      destinationUrl: 'https://riversideauto.example.com/offer',
    },
  })
  return version.id
}

// ---------- River posts (16: text, image, one page-share, one ad-share) ----------

type PostSpec = {
  id: string
  businessId: string
  type: 'TEXT' | 'IMAGE' | 'PAGE' | 'AD'
  body: string
  daysAgoOffset: number
  imageAssetIds?: string[]
}

async function seedPosts(publishedPageVersionId: string, publishedAdVersionId: string) {
  const posts: PostSpec[] = [
    {
      id: 'demo-riverpost-riverside-1',
      businessId: RIVERSIDE_ID,
      type: 'TEXT',
      daysAgoOffset: 15,
      body: 'Just wrapped a full interior + ceramic coat for a customer who drove 40 minutes to get it right. Worth it every time.',
    },
    {
      id: 'demo-riverpost-riverside-2',
      businessId: RIVERSIDE_ID,
      type: 'IMAGE',
      daysAgoOffset: 12,
      body: "Before/after from this week's bay — still our favorite part of the job.",
      imageAssetIds: ['demo-asset-square', 'demo-asset-story'],
    },
    {
      id: 'demo-riverpost-riverside-3',
      businessId: RIVERSIDE_ID,
      type: 'PAGE',
      daysAgoOffset: 9,
      body: "We refreshed our booking page for summer — 60 seconds and you're on the schedule.",
    },
    {
      id: 'demo-riverpost-riverside-4',
      businessId: RIVERSIDE_ID,
      type: 'AD',
      daysAgoOffset: 6,
      body: 'Running this on Meta this month — sharing it here too since a few of you asked what our ads actually look like.',
    },
    {
      id: 'demo-riverpost-riverside-5',
      businessId: RIVERSIDE_ID,
      type: 'TEXT',
      daysAgoOffset: 2,
      body: "Hit 500 five-star reviews this week. Thank you to everyone who's trusted us with their car.",
    },
    {
      id: 'demo-riverpost-oak-1',
      businessId: OAK_ID,
      type: 'TEXT',
      daysAgoOffset: 14,
      body: "Sourdough's back in the case as of this morning. Starter's finally happy again after the cold snap.",
    },
    {
      id: 'demo-riverpost-oak-2',
      businessId: OAK_ID,
      type: 'IMAGE',
      daysAgoOffset: 10,
      body: "Today's pastry case. The cardamom buns went in 20 minutes.",
      imageAssetIds: ['demo-asset-oak-pastry'],
    },
    {
      id: 'demo-riverpost-oak-3',
      businessId: OAK_ID,
      type: 'TEXT',
      daysAgoOffset: 4,
      body: 'Catering menu for the holidays is up — email us for a tasting box.',
    },
    {
      id: 'demo-riverpost-northshore-1',
      businessId: NORTHSHORE_ID,
      type: 'TEXT',
      daysAgoOffset: 13,
      body: 'Fall cleanup season is here. Booking two weeks out right now, so get on the list if you want leaves gone before Thanksgiving.',
    },
    {
      id: 'demo-riverpost-northshore-2',
      businessId: NORTHSHORE_ID,
      type: 'IMAGE',
      daysAgoOffset: 8,
      body: 'Full backyard renovation, week three. Sod goes down Friday.',
      imageAssetIds: ['demo-asset-northshore'],
    },
    {
      id: 'demo-riverpost-northshore-3',
      businessId: NORTHSHORE_ID,
      type: 'TEXT',
      daysAgoOffset: 3,
      body: 'Reminder: irrigation winterization is a one-time visit, not a subscription. Book before the first freeze.',
    },
    {
      id: 'demo-riverpost-copperline-1',
      businessId: COPPERLINE_ID,
      type: 'TEXT',
      daysAgoOffset: 11,
      body: 'Storm damage inspections are free through the end of the month. If hail came through your neighborhood last week, get on the schedule.',
    },
    {
      id: 'demo-riverpost-copperline-2',
      businessId: COPPERLINE_ID,
      type: 'IMAGE',
      daysAgoOffset: 7,
      body: 'New roof, one day, zero surprises. This is why we tarp the landscaping before we start.',
      imageAssetIds: ['demo-asset-copperline'],
    },
    {
      id: 'demo-riverpost-copperline-3',
      businessId: COPPERLINE_ID,
      type: 'TEXT',
      daysAgoOffset: 1,
      body: 'PSA: get the second opinion before you sign anything with an insurance adjuster. Happy to walk you through it, no charge.',
    },
    {
      id: 'demo-riverpost-fernwood-1',
      businessId: FERNWOOD_ID,
      type: 'TEXT',
      daysAgoOffset: 9,
      body: 'Wedding season wrapped for the year. 34 events, zero late deliveries. On to holiday arrangements next.',
    },
    {
      id: 'demo-riverpost-fernwood-2',
      businessId: FERNWOOD_ID,
      type: 'IMAGE',
      daysAgoOffset: 2,
      body: "Today's walk-in case — local dahlias while they last.",
      imageAssetIds: ['demo-asset-fernwood'],
    },
  ]

  for (const post of posts) {
    const createdAt = daysAgo(post.daysAgoOffset)
    if (post.type === 'PAGE') {
      await db.riverPost.upsert({
        where: { id: post.id },
        update: {},
        create: {
          id: post.id,
          businessId: post.businessId,
          type: 'PAGE',
          body: post.body,
          landingPageId: 'demo-landing-page-raw-stories',
          publishedPageVersionId,
          createdAt,
        },
      })
    } else if (post.type === 'AD') {
      await db.riverPost.upsert({
        where: { id: post.id },
        update: {},
        create: {
          id: post.id,
          businessId: post.businessId,
          type: 'AD',
          body: post.body,
          advertisementId: 'demo-advertisement-summer',
          publishedAdvertisementVersionId: publishedAdVersionId,
          createdAt,
        },
      })
    } else {
      await db.riverPost.upsert({
        where: { id: post.id },
        update: {},
        create: {
          id: post.id,
          businessId: post.businessId,
          type: 'TEXT',
          body: post.body,
          imageAssetIds: post.imageAssetIds
            ? (post.imageAssetIds as Prisma.InputJsonValue)
            : undefined,
          createdAt,
        },
      })
    }
  }
}

// ---------- Follows (10 directed edges across 5 businesses) ----------

async function seedFollows() {
  const edges: [string, string][] = [
    [RIVERSIDE_ID, NORTHSHORE_ID],
    [RIVERSIDE_ID, COPPERLINE_ID],
    [OAK_ID, RIVERSIDE_ID],
    [OAK_ID, FERNWOOD_ID],
    [NORTHSHORE_ID, RIVERSIDE_ID],
    [NORTHSHORE_ID, COPPERLINE_ID],
    [COPPERLINE_ID, RIVERSIDE_ID],
    [COPPERLINE_ID, OAK_ID],
    [FERNWOOD_ID, RIVERSIDE_ID],
    [FERNWOOD_ID, NORTHSHORE_ID],
  ]
  for (const [followerBusinessId, followedBusinessId] of edges) {
    await db.riverFollow.upsert({
      where: {
        followerBusinessId_followedBusinessId: { followerBusinessId, followedBusinessId },
      },
      update: {},
      create: { followerBusinessId, followedBusinessId },
    })
  }
}

// ---------- Reactions (20, roughly matching the follow graph) ----------

async function seedReactions() {
  const pairs: [string, string][] = [
    // actorBusinessId, riverPostId
    [OAK_ID, 'demo-riverpost-riverside-1'],
    [OAK_ID, 'demo-riverpost-riverside-3'],
    [OAK_ID, 'demo-riverpost-riverside-5'],
    [NORTHSHORE_ID, 'demo-riverpost-riverside-2'],
    [NORTHSHORE_ID, 'demo-riverpost-riverside-4'],
    [COPPERLINE_ID, 'demo-riverpost-riverside-1'],
    [COPPERLINE_ID, 'demo-riverpost-riverside-5'],
    [COPPERLINE_ID, 'demo-riverpost-oak-1'],
    [FERNWOOD_ID, 'demo-riverpost-riverside-3'],
    [FERNWOOD_ID, 'demo-riverpost-northshore-1'],
    [RIVERSIDE_ID, 'demo-riverpost-northshore-1'],
    [RIVERSIDE_ID, 'demo-riverpost-northshore-2'],
    [RIVERSIDE_ID, 'demo-riverpost-copperline-1'],
    [RIVERSIDE_ID, 'demo-riverpost-copperline-2'],
    [NORTHSHORE_ID, 'demo-riverpost-copperline-2'],
    [NORTHSHORE_ID, 'demo-riverpost-copperline-3'],
    [COPPERLINE_ID, 'demo-riverpost-oak-2'],
    [OAK_ID, 'demo-riverpost-fernwood-1'],
    [OAK_ID, 'demo-riverpost-fernwood-2'],
    [FERNWOOD_ID, 'demo-riverpost-northshore-3'],
  ]
  for (const [actorBusinessId, riverPostId] of pairs) {
    await db.riverReaction.upsert({
      where: { riverPostId_actorBusinessId: { riverPostId, actorBusinessId } },
      update: {},
      create: { riverPostId, actorBusinessId },
    })
  }
}

// ---------- Comments (9 top-level + 1 reply = 10) ----------

async function seedComments() {
  type CommentSpec = {
    id: string
    riverPostId: string
    actorBusinessId: string
    body: string
    parentCommentId?: string
  }
  const comments: CommentSpec[] = [
    {
      id: 'demo-rivercomment-1',
      riverPostId: 'demo-riverpost-riverside-1',
      actorBusinessId: OAK_ID,
      body: 'This is why we send people your way when they ask about detailing.',
    },
    {
      id: 'demo-rivercomment-2',
      riverPostId: 'demo-riverpost-riverside-4',
      actorBusinessId: NORTHSHORE_ID,
      body: "Didn't realize you were running paid — looks great.",
    },
    {
      id: 'demo-rivercomment-3',
      riverPostId: 'demo-riverpost-riverside-5',
      actorBusinessId: COPPERLINE_ID,
      body: '500 is huge. Congrats.',
    },
    {
      id: 'demo-rivercomment-4',
      riverPostId: 'demo-riverpost-riverside-3',
      actorBusinessId: FERNWOOD_ID,
      body: 'Booking flow looks clean, might steal some of this for our own site.',
    },
    {
      id: 'demo-rivercomment-5',
      riverPostId: 'demo-riverpost-northshore-1',
      actorBusinessId: RIVERSIDE_ID,
      body: 'Send them our way if any of them need the car done before the holidays too.',
    },
    {
      id: 'demo-rivercomment-6',
      riverPostId: 'demo-riverpost-northshore-1',
      actorBusinessId: NORTHSHORE_ID,
      body: 'Will do — we cross-refer all the time.',
      parentCommentId: 'demo-rivercomment-5',
    },
    {
      id: 'demo-rivercomment-7',
      riverPostId: 'demo-riverpost-copperline-1',
      actorBusinessId: RIVERSIDE_ID,
      body: 'Good to know, we had hail in our lot too.',
    },
    {
      id: 'demo-rivercomment-8',
      riverPostId: 'demo-riverpost-copperline-2',
      actorBusinessId: NORTHSHORE_ID,
      body: 'Clean tarp work, appreciate that more than people know.',
    },
    {
      id: 'demo-rivercomment-9',
      riverPostId: 'demo-riverpost-fernwood-1',
      actorBusinessId: OAK_ID,
      body: '34 weddings is wild. We did the cake table for three of those I think.',
    },
    {
      id: 'demo-rivercomment-10',
      riverPostId: 'demo-riverpost-oak-2',
      actorBusinessId: COPPERLINE_ID,
      body: 'Those cardamom buns are the only reason I show up early on Saturdays.',
    },
  ]
  for (const c of comments) {
    await db.riverComment.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        riverPostId: c.riverPostId,
        actorBusinessId: c.actorBusinessId,
        body: c.body,
        parentCommentId: c.parentCommentId,
      },
    })
  }
}
