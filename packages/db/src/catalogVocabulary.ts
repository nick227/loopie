// Shared Catalog Vocabulary (Pages/Ads boundary, 2026-09-10) — see
// docs/strategy/pages-and-ads-shared-catalog-boundary.md.
//
// This file seeds the two pure-vocabulary tables (Capability, Genre — see their own schema.prisma
// doc comments). It must never import or reference anything Page-specific (LandingPageTemplate,
// PageType, ...) or Advertisement-specific — that coupling belongs in each domain's own
// compatibility catalog (e.g. packages/db/src/pageCompatibilityCatalog.ts), not here.
//
// The six Capability rows below originate from Pages' current Phase 1 needs (see
// pageCompatibilityCatalog.ts's requirement/support matrices), which is expected and fine — a
// vocabulary row costs nothing to leave unused by a domain that doesn't need it (AD_MONETIZATION
// plausibly never applies *to* an Advertisement itself, for instance). What matters is that this
// row's own definition carries no Page-specific meaning, only a name Pages currently happens to
// be the first consumer of.

import type { Prisma } from '@prisma/client'

export type CapabilityVocabularyEntry = {
  key: string
  label: string
  description: string
}

export const CAPABILITY_VOCABULARY: CapabilityVocabularyEntry[] = [
  {
    key: 'LEAD_CAPTURE',
    label: 'Lead Capture',
    description: 'Collects a visitor’s contact details via an attached form.',
  },
  {
    key: 'GALLERY',
    label: 'Gallery / Media Showcase',
    description: 'A visual wall of images or work samples, not paired with case-study copy.',
  },
  {
    key: 'SOCIAL_PROOF',
    label: 'Social Proof',
    description: 'Testimonials, client quotes, or trusted-by logos.',
  },
  {
    key: 'PRODUCT_CATALOG',
    label: 'Product Catalog',
    description: 'Priced items or category tiles for browsing/buying.',
  },
  {
    key: 'LIVE_EVENT_DATA',
    label: 'Live Event Data',
    description: 'Event/webinar details plus a live, computed seats-filled count.',
  },
  {
    key: 'AD_MONETIZATION',
    label: 'Ad Monetization',
    description: 'First-party ad slots that can be filled by an AdRun or Advertisement.',
  },
]

// No genre rows are seeded in this pass — nothing consumes Genre yet (see the Pages roadmap's
// §2.4: it's catalog browsing/classification metadata, deliberately kept out of Phase 1's scope).
// The table exists so it's available with no extraction migration once something needs it.
export const GENRE_VOCABULARY: CapabilityVocabularyEntry[] = []

type VocabularyClient = Pick<Prisma.TransactionClient, 'capability' | 'genre'>

export async function ensureCatalogVocabulary(tx: VocabularyClient) {
  for (const entry of CAPABILITY_VOCABULARY) {
    await tx.capability.upsert({
      where: { key: entry.key },
      update: { label: entry.label, description: entry.description },
      create: entry,
    })
  }
  for (const entry of GENRE_VOCABULARY) {
    await tx.genre.upsert({
      where: { key: entry.key },
      update: { label: entry.label, description: entry.description },
      create: entry,
    })
  }
}
