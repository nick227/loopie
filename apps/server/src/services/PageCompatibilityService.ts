// Page compatibility evaluator (Pages Phase 1, 2026-09-10) — see
// docs/strategy/pages-page-types-and-style-axes-roadmap.md §3.
//
// Page-domain only. Nothing here is imported by, or should ever be imported by, Advertisement
// code. INVARIANT (docs/strategy/pages-page-types-and-style-axes-roadmap.md §3.4): genre, style
// tags, and any other catalog/marketing metadata must never be an input here — PageInstanceState
// below carries only enabledCapabilities and populatedSlotGroups, structurally. There is no field
// on that type for genre/style to occupy; adding one is the thing to catch in review, not runtime.
import {
  db,
  KNOWN_SLOT_GROUPS,
  CAPABILITY_KEYS,
  PAGE_TYPE_KEYS,
  type SlotGroupKey,
  type CapabilityKey,
  type PageTypeKey,
  type RequirementLevel,
  type SupportLevel,
} from '@project/db'

export type PageCompatibilityIssue = {
  kind: 'capability' | 'slot'
  key: string
  reason: string
}

export type PageCompatibilityResult = {
  compatible: boolean
  blockers: PageCompatibilityIssue[]
  warnings: PageCompatibilityIssue[]
  supportedLayouts: string[] // LandingPageTemplate ids
}

// The three signals kept structurally distinct per §3.1 — never inferred from one another.
export type PageInstanceState = {
  enabledCapabilities: Set<CapabilityKey>
  populatedSlotGroups: Set<SlotGroupKey>
}

// Heuristic, documented as such (see the Phase 1 report): populated = has a non-empty `items`
// array, or at least one truthy leaf value elsewhere on the slot object. Good enough to drive a
// decision-gate report; not a claim of pixel-perfect "will this render something" precision.
function isSlotPopulated(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (Array.isArray(obj.items)) return obj.items.length > 0
  return Object.values(obj).some((v) => {
    if (Array.isArray(v)) return v.length > 0
    if (v && typeof v === 'object') return Object.values(v as Record<string, unknown>).some(Boolean)
    return Boolean(v)
  })
}

// Enabled capabilities and populated slot groups are computed independently — see §3.1. Lead
// Capture/Ad Monetization are relation-backed (their relation's existence *is* "enabled", there
// is no meaningful "enabled but not attached" state for those two); every other capability comes
// only from the page's own explicit `enabledCapabilities` opt-in, never inferred from content.
export function computePageState(page: {
  content: unknown
  formId: string | null
  enabledCapabilities: unknown
  hasAdSlots: boolean
}): PageInstanceState {
  const content = (page.content ?? {}) as Record<string, unknown>
  const populatedSlotGroups = new Set<SlotGroupKey>()
  for (const slot of KNOWN_SLOT_GROUPS) {
    if (isSlotPopulated(content[slot])) populatedSlotGroups.add(slot)
  }

  const enabledCapabilities = new Set<CapabilityKey>()
  const explicit = Array.isArray(page.enabledCapabilities) ? page.enabledCapabilities : []
  for (const key of explicit) {
    if ((CAPABILITY_KEYS as string[]).includes(key as string)) {
      enabledCapabilities.add(key as CapabilityKey)
    }
  }
  if (page.formId) enabledCapabilities.add('LEAD_CAPTURE')
  if (page.hasAdSlots) enabledCapabilities.add('AD_MONETIZATION')

  return { enabledCapabilities, populatedSlotGroups }
}

export type PageCompatibilityContract = {
  layouts: Array<{ id: string; pageType: PageTypeKey }>
  pageTypeCapability: Map<PageTypeKey, Map<CapabilityKey, RequirementLevel>>
  layoutCapability: Map<string, Map<CapabilityKey, SupportLevel>>
  layoutSlotSupport: Map<string, Map<SlotGroupKey, SupportLevel>>
}

export async function loadPageCompatibilityContract(): Promise<PageCompatibilityContract> {
  const [capabilities, templates, pageTypeCapRows, layoutCapRows, layoutSlotRows] =
    await Promise.all([
      db.capability.findMany({ select: { id: true, key: true } }),
      db.landingPageTemplate.findMany({ select: { id: true, pageType: true } }),
      db.pageTypeCapability.findMany({
        select: { pageType: true, capabilityId: true, requirementLevel: true },
      }),
      db.pageLayoutCapability.findMany({
        select: { landingPageTemplateId: true, capabilityId: true, supportLevel: true },
      }),
      db.pageLayoutSlotSupport.findMany({
        select: { landingPageTemplateId: true, slotGroup: true, supportLevel: true },
      }),
    ])

  const capabilityKeyById = new Map(capabilities.map((c) => [c.id, c.key as CapabilityKey]))

  const pageTypeCapability = new Map<PageTypeKey, Map<CapabilityKey, RequirementLevel>>()
  for (const pageType of PAGE_TYPE_KEYS) pageTypeCapability.set(pageType, new Map())
  for (const row of pageTypeCapRows) {
    const capabilityKey = capabilityKeyById.get(row.capabilityId)
    if (!capabilityKey) continue
    pageTypeCapability
      .get(row.pageType as PageTypeKey)!
      .set(capabilityKey, row.requirementLevel as RequirementLevel)
  }

  const layoutCapability = new Map<string, Map<CapabilityKey, SupportLevel>>()
  for (const row of layoutCapRows) {
    const capabilityKey = capabilityKeyById.get(row.capabilityId)
    if (!capabilityKey) continue
    if (!layoutCapability.has(row.landingPageTemplateId))
      layoutCapability.set(row.landingPageTemplateId, new Map())
    layoutCapability
      .get(row.landingPageTemplateId)!
      .set(capabilityKey, row.supportLevel as SupportLevel)
  }

  const layoutSlotSupport = new Map<string, Map<SlotGroupKey, SupportLevel>>()
  for (const row of layoutSlotRows) {
    if (!layoutSlotSupport.has(row.landingPageTemplateId))
      layoutSlotSupport.set(row.landingPageTemplateId, new Map())
    layoutSlotSupport
      .get(row.landingPageTemplateId)!
      .set(row.slotGroup as SlotGroupKey, row.supportLevel as SupportLevel)
  }

  return {
    layouts: templates.map((t) => ({ id: t.id, pageType: t.pageType as PageTypeKey })),
    pageTypeCapability,
    layoutCapability,
    layoutSlotSupport,
  }
}

function layoutSupportFor(
  contract: PageCompatibilityContract,
  layoutId: string,
  kind: 'capability' | 'slot',
  key: string,
): SupportLevel {
  if (kind === 'capability') {
    return contract.layoutCapability.get(layoutId)?.get(key as CapabilityKey) ?? 'UNSUPPORTED'
  }
  return contract.layoutSlotSupport.get(layoutId)?.get(key as SlotGroupKey) ?? 'UNSUPPORTED'
}

// ACTIVE vs. DORMANT (2026-09-10 correction — see docs/strategy/pages-page-types-and-style-axes-roadmap.md
// and the review that followed it). LOOPIE deliberately preserves unused slot data across a
// Layout switch (see docs/architecture/landing-page-layouts-and-themes.md's "Template switch does
// not wipe unused content slots" — long-standing, intentional product behavior, not a bug this
// evaluator gets to override). That means "populated" alone is NOT evidence of a problem: content
// populated in a slot group the page's OWN CURRENT Layout already doesn't render (UNSUPPORTED
// there) is DORMANT — it was already invisible before any compatibility question was ever asked,
// so evaluating it against some other target can never make it "newly" unavailable. Only content
// that's currently ACTIVE (the current Layout renders it — REQUIRED or SUPPORTED there) can be
// genuinely lost by a switch, and only that case is a real BLOCKER; dormant content losing its
// (already-absent) rendering path elsewhere is a WARNING at most, never a blocker — this is what
// keeps the evaluator from becoming stricter than the product behavior it's modeling.
//
// currentLayoutId is optional. When supplied, it's both the source of truth for active/dormant
// AND (for a REQUIRED-on-current -> SUPPORTED-on-target transition on already-active content) the
// source of the "becomes optional/hideable here" downgrade warning. When omitted (a from-scratch
// check, e.g. a creation-flow preview with no prior Layout to compare against), every
// enabled/populated item is treated as active by default — there is no dormant history to weigh
// it against, so the conservative read is the one worth surfacing.
//
// A direct, provable consequence: calling this with layoutId === currentLayoutId (or letting the
// contract's own PageTypeCapability/PageLayoutCapability rows describe a page's own current
// Layout) can NEVER produce a blocker — currentLevel and targetLevel are identical in that case,
// so the only way into the UNSUPPORTED branch is already-dormant, which is warning-only. A page's
// own current Layout is, by definition, exactly what has been rendering it; nothing here second-
// guesses that after the fact.
export function evaluateLayoutCompatibility(
  state: PageInstanceState,
  layoutId: string,
  contract: PageCompatibilityContract,
  currentLayoutId?: string,
): PageCompatibilityResult {
  const blockers: PageCompatibilityIssue[] = []
  const warnings: PageCompatibilityIssue[] = []

  const check = (kind: 'capability' | 'slot', key: string) => {
    const targetLevel = layoutSupportFor(contract, layoutId, kind, key)
    const currentLevel = currentLayoutId
      ? layoutSupportFor(contract, currentLayoutId, kind, key)
      : null
    const isActive = currentLevel === null ? true : currentLevel !== 'UNSUPPORTED'
    const label = kind === 'capability' ? 'Capability' : 'Slot'

    if (targetLevel === 'UNSUPPORTED') {
      if (isActive) {
        blockers.push({
          kind,
          key,
          reason: `${label} "${key}" is currently active (rendered by the page's own current Layout) but Layout "${layoutId}" cannot present it.`,
        })
      } else {
        warnings.push({
          kind,
          key,
          reason: `${label} "${key}" is populated but already dormant (not rendered by the current Layout either) — stays dormant on Layout "${layoutId}", not a new loss.`,
        })
      }
      return
    }
    if (currentLevel === 'REQUIRED' && targetLevel === 'SUPPORTED') {
      warnings.push({
        kind,
        key,
        reason: `${label} "${key}" is always shown on the current Layout but only optional/hideable on Layout "${layoutId}".`,
      })
    }
  }

  for (const capabilityKey of state.enabledCapabilities) check('capability', capabilityKey)
  for (const slotGroup of state.populatedSlotGroups) check('slot', slotGroup)

  return {
    compatible: blockers.length === 0,
    blockers,
    warnings,
    supportedLayouts: blockers.length === 0 ? [layoutId] : [],
  }
}

export function evaluatePageTypeCompatibility(
  state: PageInstanceState,
  pageType: PageTypeKey,
  contract: PageCompatibilityContract,
  currentLayoutId?: string,
): PageCompatibilityResult {
  const candidateLayouts = contract.layouts.filter((l) => l.pageType === pageType)
  const perLayout = candidateLayouts.map((l) =>
    evaluateLayoutCompatibility(state, l.id, contract, currentLayoutId),
  )
  const supportedLayouts = perLayout.filter((r) => r.compatible).map((r) => r.supportedLayouts[0]!)

  if (supportedLayouts.length > 0) {
    const warnings = dedupeIssues(perLayout.filter((r) => r.compatible).flatMap((r) => r.warnings))
    return { compatible: true, blockers: [], warnings, supportedLayouts }
  }

  return {
    compatible: false,
    blockers: dedupeIssues(perLayout.flatMap((r) => r.blockers)),
    warnings: [],
    supportedLayouts: [],
  }
}

function dedupeIssues(issues: PageCompatibilityIssue[]): PageCompatibilityIssue[] {
  const seen = new Map<string, PageCompatibilityIssue>()
  for (const issue of issues) seen.set(`${issue.kind}:${issue.key}:${issue.reason}`, issue)
  return [...seen.values()]
}
