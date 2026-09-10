// Pages Phase 1 (2026-09-10) — see docs/strategy/pages-page-types-and-style-axes-roadmap.md §3
// and docs/strategy/pages-and-ads-shared-catalog-boundary.md.
import { describe, it, expect, beforeEach } from 'vitest'
import { db, CAPABILITY_KEYS, PAGE_TYPE_KEYS } from '@project/db'
import { ensureSystemTemplates } from '../lib/ensureSystemTemplates'
import {
  computePageState,
  evaluateLayoutCompatibility,
  evaluatePageTypeCompatibility,
  loadPageCompatibilityContract,
  type PageInstanceState,
} from '../services/PageCompatibilityService'

const SYSTEM_LAYOUT_PAGE_TYPES: Record<string, string> = {
  'system-template-lead-gen': 'LANDING',
  'system-template-lead-gen-media': 'EMAIL_CAPTURE',
  'system-template-corporate-professional': 'HOME',
  'system-template-webinar-signup': 'EVENT',
  'system-template-studio': 'STUDIO',
  'system-template-portfolio': 'PORTFOLIO',
  'system-template-store': 'STORE',
  'system-template-email-outreach': 'EMAIL_CAPTURE',
  'system-template-general': 'GENERAL',
}

describe('page compatibility contract (Phase 1)', () => {
  // beforeEach, not beforeAll — setup.ts's global afterEach wipes landingPageTemplate (cascading
  // onto PageLayoutCapability/PageLayoutSlotSupport) between every test in the whole suite, so
  // the contract must be reseeded before each test in this file, not once for the file.
  beforeEach(async () => {
    await ensureSystemTemplates(db)
  })

  it('seeds the shared Capability vocabulary and the full Page-domain contract', async () => {
    const capabilities = await db.capability.findMany()
    expect(capabilities.map((c) => c.key).sort()).toEqual([...CAPABILITY_KEYS].sort())

    const pageTypeCapability = await db.pageTypeCapability.findMany()
    expect(pageTypeCapability.length).toBe(PAGE_TYPE_KEYS.length * CAPABILITY_KEYS.length)

    for (const templateId of Object.keys(SYSTEM_LAYOUT_PAGE_TYPES)) {
      const template = await db.landingPageTemplate.findUnique({ where: { id: templateId } })
      expect(template?.pageType).toBe(SYSTEM_LAYOUT_PAGE_TYPES[templateId])

      const capabilityRows = await db.pageLayoutCapability.findMany({
        where: { landingPageTemplateId: templateId },
      })
      expect(capabilityRows.length).toBe(CAPABILITY_KEYS.length)

      const slotRows = await db.pageLayoutSlotSupport.findMany({
        where: { landingPageTemplateId: templateId },
      })
      expect(slotRows.length).toBe(17) // KNOWN_SLOT_GROUPS.length
    }
  })

  it('every real system Layout is self-compatible with its own assigned PageType (no modeling bug)', async () => {
    const contract = await loadPageCompatibilityContract()

    for (const [templateId, pageType] of Object.entries(SYSTEM_LAYOUT_PAGE_TYPES)) {
      // Simulate a fresh page from this Layout with nothing but its own REQUIRED content —
      // exactly what LandingPageService.create()'s starter content produces in spirit. A Layout
      // must always be compatible with its own required content on its own Layout.
      const slotSupport = contract.layoutSlotSupport.get(templateId)!
      const capabilitySupport = contract.layoutCapability.get(templateId)!
      const state: PageInstanceState = {
        enabledCapabilities: new Set(
          [...capabilitySupport.entries()]
            .filter(([, level]) => level === 'REQUIRED')
            .map(([k]) => k),
        ),
        populatedSlotGroups: new Set(
          [...slotSupport.entries()].filter(([, level]) => level === 'REQUIRED').map(([k]) => k),
        ),
      }

      const selfResult = evaluateLayoutCompatibility(state, templateId, contract)
      expect(
        selfResult.compatible,
        `${templateId} not self-compatible: ${JSON.stringify(selfResult.blockers)}`,
      ).toBe(true)

      const typeResult = evaluatePageTypeCompatibility(state, pageType as never, contract)
      expect(
        typeResult.compatible,
        `${templateId} not compatible with its own PageType ${pageType}: ${JSON.stringify(typeResult.blockers)}`,
      ).toBe(true)
      expect(typeResult.supportedLayouts).toContain(templateId)
    }
  })

  it('Portfolio (its own Page Type since the 2026-09-10 split) never supports Gallery — the real catalog evidence that PORTFOLIO.GALLERY is ALLOWED, not RECOMMENDED', async () => {
    const contract = await loadPageCompatibilityContract()
    const state: PageInstanceState = {
      enabledCapabilities: new Set(),
      populatedSlotGroups: new Set(),
    }
    const result = evaluateLayoutCompatibility(state, 'system-template-portfolio', contract)
    expect(result.compatible).toBe(true)

    const portfolioGallerySupport = contract.layoutSlotSupport
      .get('system-template-portfolio')
      ?.get('gallery')
    expect(portfolioGallerySupport).toBe('UNSUPPORTED')

    const portfolioType = contract.layouts.find(
      (l) => l.id === 'system-template-portfolio',
    )?.pageType
    expect(portfolioType).toBe('PORTFOLIO')
    const studioType = contract.layouts.find((l) => l.id === 'system-template-studio')?.pageType
    expect(studioType).toBe('STUDIO')
  })

  it('blocks a from-scratch check (no currentLayoutId) that would strand populated content with nowhere to render — treated as active by default', async () => {
    const contract = await loadPageCompatibilityContract()
    // No currentLayoutId — e.g. a creation-flow preview with no prior Layout to compare against.
    // Populated content is treated as active by default in that case (the conservative read).
    const state: PageInstanceState = {
      enabledCapabilities: new Set(),
      populatedSlotGroups: new Set(['products']),
    }
    const result = evaluateLayoutCompatibility(state, 'system-template-lead-gen', contract)
    expect(result.compatible).toBe(false)
    expect(result.blockers).toEqual([expect.objectContaining({ kind: 'slot', key: 'products' })])
  })

  it('active vs. dormant (2026-09-10 correction): a page can NEVER be blocked by its own current Layout on already-dormant content, and switching between two Layouts that both lack support for it is a warning, not a blocker', async () => {
    const contract = await loadPageCompatibilityContract()
    // The real pattern found in the live compatibility matrix: `media` content left over from an
    // earlier Layout, now sitting on a Layout (Studio) whose schema never had a media-image/
    // media-audio/media-youtube section at all — dormant since before this page's Layout became
    // Studio, not newly broken by anything this evaluator does.
    const mediaSupportOnStudio = contract.layoutSlotSupport
      .get('system-template-studio')
      ?.get('media')
    expect(mediaSupportOnStudio).toBe('UNSUPPORTED')
    const state: PageInstanceState = {
      enabledCapabilities: new Set(),
      populatedSlotGroups: new Set(['media']),
    }

    // Self-check: evaluating the page's own current Layout against itself can never block, even
    // though `media` is genuinely UNSUPPORTED there — it was already dormant, not a regression.
    const selfResult = evaluateLayoutCompatibility(
      state,
      'system-template-studio',
      contract,
      'system-template-studio',
    )
    expect(selfResult.compatible).toBe(true)
    expect(selfResult.blockers).toEqual([])
    expect(selfResult.warnings).toEqual([expect.objectContaining({ kind: 'slot', key: 'media' })])

    // Switching to a different Layout that ALSO doesn't support `media` (corporate-professional):
    // still dormant before and after, still a warning, never a blocker.
    const switchResult = evaluateLayoutCompatibility(
      state,
      'system-template-corporate-professional',
      contract,
      'system-template-studio',
    )
    expect(switchResult.compatible).toBe(true)
    expect(switchResult.blockers).toEqual([])
    expect(switchResult.warnings).toEqual([expect.objectContaining({ kind: 'slot', key: 'media' })])
  })

  it('active vs. dormant: switching AWAY from a Layout that actively renders a slot to one that cannot is a real blocker', async () => {
    const contract = await loadPageCompatibilityContract()
    // `media` IS active (SUPPORTED) on lead-gen. Switching to studio (UNSUPPORTED for media) would
    // genuinely hide something visible today — a real blocker, not a dormant-content warning.
    const state: PageInstanceState = {
      enabledCapabilities: new Set(),
      populatedSlotGroups: new Set(['media']),
    }
    const result = evaluateLayoutCompatibility(
      state,
      'system-template-studio',
      contract,
      'system-template-lead-gen',
    )
    expect(result.compatible).toBe(false)
    expect(result.blockers).toEqual([expect.objectContaining({ kind: 'slot', key: 'media' })])
  })

  it('warns, but does not block, a switch that downgrades a REQUIRED slot to merely optional', async () => {
    const contract = await loadPageCompatibilityContract()
    // hero is REQUIRED on corporate-professional and REQUIRED on studio too — pick a slot that's
    // REQUIRED on one Layout and only SUPPORTED (not REQUIRED, not UNSUPPORTED) on another: footer
    // is REQUIRED on studio but only SUPPORTED (cta-band, hideable:true) on webinar-signup.
    const state: PageInstanceState = {
      enabledCapabilities: new Set(),
      populatedSlotGroups: new Set(['footer']),
    }
    const result = evaluateLayoutCompatibility(
      state,
      'system-template-webinar-signup',
      contract,
      'system-template-studio',
    )
    expect(result.compatible).toBe(true)
    expect(result.warnings).toEqual([expect.objectContaining({ kind: 'slot', key: 'footer' })])
  })

  it('keeps enabled-capability, populated-slot, and visibility as independent signals (§3.1) — never inferred from one another', () => {
    // A capability can be enabled with zero matching content populated.
    const enabledOnly = computePageState({
      content: {},
      formId: null,
      enabledCapabilities: ['GALLERY'],
      hasAdSlots: false,
    })
    expect(enabledOnly.enabledCapabilities.has('GALLERY')).toBe(true)
    expect(enabledOnly.populatedSlotGroups.has('gallery')).toBe(false)

    // Content can be populated (e.g. left over from a prior Layout) with the capability never
    // explicitly enabled.
    const populatedOnly = computePageState({
      content: { gallery: { items: [{ url: 'https://example.com/a.jpg' }] } },
      formId: null,
      enabledCapabilities: [],
      hasAdSlots: false,
    })
    expect(populatedOnly.populatedSlotGroups.has('gallery')).toBe(true)
    expect(populatedOnly.enabledCapabilities.has('GALLERY')).toBe(false)

    // Lead Capture/Ad Monetization are relation-backed, not content-backed — presence of the
    // relation is the enabled state, with no dependency on PageContent at all.
    const relationBacked = computePageState({
      content: {},
      formId: 'form-1',
      enabledCapabilities: [],
      hasAdSlots: true,
    })
    expect(relationBacked.enabledCapabilities.has('LEAD_CAPTURE')).toBe(true)
    expect(relationBacked.enabledCapabilities.has('AD_MONETIZATION')).toBe(true)
  })
})
