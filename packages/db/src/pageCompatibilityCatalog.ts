// Page compatibility contract catalog (Pages Phase 1, 2026-09-10) — see
// docs/strategy/pages-page-types-and-style-axes-roadmap.md §3 and
// docs/strategy/pages-and-ads-shared-catalog-boundary.md.
//
// Page-domain only, despite living in this shared package (same convention as leadGenTemplate.ts
// already uses for Page-only concerns). Nothing here is consumed by, or should ever be imported
// by, Advertisement code. It references the shared Capability vocabulary (catalogVocabulary.ts)
// from the outside; it never adds Page-specific fields onto Capability/Genre themselves.
//
// Two kinds of content here:
//   1. PAGE_TYPE_CAPABILITY_MATRIX — hand-authored product judgment (which capabilities each
//      PageType requires/recommends/allows). Static, reviewed data, not derived from anything.
//   2. deriveLayoutSlotSupport / deriveLayoutCapabilitySupport — pure functions computed from a
//      Layout's own existing TemplateSchema (packages/db/src/leadGenTemplate.ts's `sections`),
//      so a Layout's contract row can never silently drift from what its schema actually declares.

import type { Prisma } from '@prisma/client'
import type { TemplateSchema } from './leadGenTemplate'
import { SECTION_TYPE_TO_SLOT_GROUP, KNOWN_SLOT_GROUPS, type SlotGroupKey } from './content'

export type CapabilityKey =
  | 'LEAD_CAPTURE'
  | 'GALLERY'
  | 'SOCIAL_PROOF'
  | 'PRODUCT_CATALOG'
  | 'LIVE_EVENT_DATA'
  | 'AD_MONETIZATION'

export const CAPABILITY_KEYS: CapabilityKey[] = [
  'LEAD_CAPTURE',
  'GALLERY',
  'SOCIAL_PROOF',
  'PRODUCT_CATALOG',
  'LIVE_EVENT_DATA',
  'AD_MONETIZATION',
]

export type PageTypeKey =
  'HOME' | 'LANDING' | 'STUDIO' | 'PORTFOLIO' | 'EMAIL_CAPTURE' | 'STORE' | 'EVENT' | 'GENERAL'

export const PAGE_TYPE_KEYS: PageTypeKey[] = [
  'HOME',
  'LANDING',
  'STUDIO',
  'PORTFOLIO',
  'EMAIL_CAPTURE',
  'STORE',
  'EVENT',
  'GENERAL',
]

export type RequirementLevel = 'REQUIRED' | 'RECOMMENDED' | 'ALLOWED'
export type SupportLevel = 'REQUIRED' | 'SUPPORTED' | 'UNSUPPORTED'

// Every PageType x Capability pair is explicit — no implicit default — so a reviewer can read
// this table as the complete, literal contract rather than having to know a fallback rule.
//
// PORTFOLIO split out of STUDIO 2026-09-10 (see roadmap doc §9) precisely because Portfolio
// (system-template-portfolio) declares no 'gallery'/photo-gallery section at all — its "show your
// work" job is carried by `services` (service-selector, each item with its own media) instead.
// Now that it's its own Page Type with its own single Layout, GALLERY is correctly ALLOWED there
// (not RECOMMENDED — the one real Layout in this type doesn't support it) while STUDIO (now
// Studio-only) keeps GALLERY at RECOMMENDED, since its one real Layout genuinely does support it.
export const PAGE_TYPE_CAPABILITY_MATRIX: Record<
  PageTypeKey,
  Record<CapabilityKey, RequirementLevel>
> = {
  HOME: {
    LEAD_CAPTURE: 'RECOMMENDED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'RECOMMENDED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
  LANDING: {
    LEAD_CAPTURE: 'RECOMMENDED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'RECOMMENDED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
  STUDIO: {
    LEAD_CAPTURE: 'RECOMMENDED',
    GALLERY: 'RECOMMENDED',
    SOCIAL_PROOF: 'RECOMMENDED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
  PORTFOLIO: {
    LEAD_CAPTURE: 'RECOMMENDED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'RECOMMENDED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
  EMAIL_CAPTURE: {
    LEAD_CAPTURE: 'REQUIRED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'ALLOWED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
  STORE: {
    LEAD_CAPTURE: 'ALLOWED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'RECOMMENDED',
    PRODUCT_CATALOG: 'REQUIRED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
  EVENT: {
    LEAD_CAPTURE: 'RECOMMENDED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'ALLOWED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'REQUIRED',
    AD_MONETIZATION: 'ALLOWED',
  },
  // Deliberately unopinionated — every capability ALLOWED, nothing RECOMMENDED/REQUIRED. This is
  // the one Page Type meant to carry no assumed purpose at all (see roadmap doc §9).
  GENERAL: {
    LEAD_CAPTURE: 'ALLOWED',
    GALLERY: 'ALLOWED',
    SOCIAL_PROOF: 'ALLOWED',
    PRODUCT_CATALOG: 'ALLOWED',
    LIVE_EVENT_DATA: 'ALLOWED',
    AD_MONETIZATION: 'ALLOWED',
  },
}

// Which slot group(s) feed a content-backed capability. A capability's support level is the most
// open (REQUIRED > SUPPORTED > UNSUPPORTED) among its feeder slot groups' own support levels.
// LEAD_CAPTURE and AD_MONETIZATION are handled separately below — neither is a slot group.
const CAPABILITY_SLOT_FEEDS: Partial<Record<CapabilityKey, SlotGroupKey[]>> = {
  GALLERY: ['gallery'],
  SOCIAL_PROOF: ['testimonials', 'logos'],
  PRODUCT_CATALOG: ['products', 'categories'],
  LIVE_EVENT_DATA: ['webinar'],
}

const LEVEL_RANK: Record<SupportLevel, number> = { UNSUPPORTED: 0, SUPPORTED: 1, REQUIRED: 2 }

function mostOpen(levels: SupportLevel[]): SupportLevel {
  return levels.reduce(
    (best, level) => (LEVEL_RANK[level] > LEVEL_RANK[best] ? level : best),
    'UNSUPPORTED' as SupportLevel,
  )
}

// Derived purely from the Layout's own schema.sections — never hand-maintained per Layout, so it
// can't silently drift from what the Layout actually renders.
export function deriveLayoutSlotSupport(
  schema: TemplateSchema,
): Record<SlotGroupKey, SupportLevel> {
  const bySlot = new Map<SlotGroupKey, SupportLevel>()
  for (const section of schema.sections ?? []) {
    const slot = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    if (!slot) continue // form-embed and any other non-content-slot section type
    const level: SupportLevel = section.hideable === false ? 'REQUIRED' : 'SUPPORTED'
    const existing = bySlot.get(slot)
    bySlot.set(slot, existing ? mostOpen([existing, level]) : level)
  }
  const result = {} as Record<SlotGroupKey, SupportLevel>
  for (const slot of KNOWN_SLOT_GROUPS) {
    result[slot] = bySlot.get(slot) ?? 'UNSUPPORTED'
  }
  return result
}

export function deriveLayoutCapabilitySupport(
  schema: TemplateSchema,
): Record<CapabilityKey, SupportLevel> {
  const slotSupport = deriveLayoutSlotSupport(schema)
  const result = {} as Record<CapabilityKey, SupportLevel>

  for (const capability of CAPABILITY_KEYS) {
    if (capability === 'AD_MONETIZATION') {
      // LandingPageAdSlot has no dependency on templateId/schema — any LandingPage can carry ad
      // slots regardless of Layout. Uniformly SUPPORTED, never REQUIRED (no Layout mandates ads).
      result[capability] = 'SUPPORTED'
      continue
    }
    if (capability === 'LEAD_CAPTURE') {
      const formSection = (schema.sections ?? []).find((s) => s.type === 'form-embed')
      result[capability] = !formSection
        ? 'UNSUPPORTED'
        : formSection.hideable === false
          ? 'REQUIRED'
          : 'SUPPORTED'
      continue
    }
    const feeds = CAPABILITY_SLOT_FEEDS[capability] ?? []
    result[capability] = mostOpen(feeds.map((slot) => slotSupport[slot]))
  }
  return result
}

// The real generated Prisma client/transaction-client shape, narrowed to just what this file
// uses — hand-rolling a structural stand-in type here fights Prisma's generic upsert signatures
// (unique-where unions, etc.) for no benefit; this file already only calls plain upsert/findMany.
type ContractClient = Pick<
  Prisma.TransactionClient,
  'capability' | 'pageTypeCapability' | 'pageLayoutCapability' | 'pageLayoutSlotSupport'
>

// Idempotent. Call once for the static PageType x Capability matrix, and once per Layout
// (immediately after that Layout's own row is upserted — see ensureSystemTemplates.ts).
export async function ensurePageTypeCapabilityMatrix(tx: ContractClient) {
  const capabilities = await tx.capability.findMany({ select: { id: true, key: true } })
  const idByKey = new Map(capabilities.map((c) => [c.key, c.id]))

  for (const pageType of PAGE_TYPE_KEYS) {
    for (const capabilityKey of CAPABILITY_KEYS) {
      const capabilityId = idByKey.get(capabilityKey)
      if (!capabilityId) continue // Capability vocabulary not seeded yet — caller's ordering bug, not silently ignored in tests
      const requirementLevel = PAGE_TYPE_CAPABILITY_MATRIX[pageType][capabilityKey]
      await tx.pageTypeCapability.upsert({
        where: { pageType_capabilityId: { pageType, capabilityId } },
        update: { requirementLevel },
        create: { pageType, capabilityId, requirementLevel },
      })
    }
  }
}

export async function ensurePageLayoutContract(
  tx: ContractClient,
  landingPageTemplateId: string,
  schema: TemplateSchema,
) {
  const capabilities = await tx.capability.findMany({ select: { id: true, key: true } })
  const idByKey = new Map(capabilities.map((c) => [c.key, c.id]))

  const capabilitySupport = deriveLayoutCapabilitySupport(schema)
  for (const capabilityKey of CAPABILITY_KEYS) {
    const capabilityId = idByKey.get(capabilityKey)
    if (!capabilityId) continue
    const supportLevel = capabilitySupport[capabilityKey]
    await tx.pageLayoutCapability.upsert({
      where: { landingPageTemplateId_capabilityId: { landingPageTemplateId, capabilityId } },
      update: { supportLevel },
      create: { landingPageTemplateId, capabilityId, supportLevel },
    })
  }

  const slotSupport = deriveLayoutSlotSupport(schema)
  for (const slotGroup of KNOWN_SLOT_GROUPS) {
    const supportLevel = slotSupport[slotGroup]
    await tx.pageLayoutSlotSupport.upsert({
      where: { landingPageTemplateId_slotGroup: { landingPageTemplateId, slotGroup } },
      update: { supportLevel },
      create: { landingPageTemplateId, slotGroup, supportLevel },
    })
  }
}
