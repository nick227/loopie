// Pages Phase 1 decision-gate artifact (2026-09-10) — see
// docs/strategy/pages-page-types-and-style-axes-roadmap.md §6 Phase 1.
//
// Runs the compatibility evaluator against every existing, non-deleted LandingPage in the target
// database (not just the 7/8 system templates) and produces the full per-page matrix the roadmap
// specifies: current Page Type, enabled capabilities, populated slots, current Layout, compatible
// Layouts (checked against the WHOLE catalog, not just the page's own current Page Type —
// deliberate, see the roadmap doc), compatible target Page Types, blockers, warnings.
//
// Read-only. Does not mutate any LandingPage row. Writes a CSV + JSON report and prints a summary.
//
// Usage: tsx --env-file=../../.env scripts/pageCompatibilityMatrix.ts
import { db, PAGE_TYPE_KEYS, type PageTypeKey } from '@project/db'
import { ensureSystemTemplates } from '../src/lib/ensureSystemTemplates'
import {
  computePageState,
  evaluateLayoutCompatibility,
  evaluatePageTypeCompatibility,
  loadPageCompatibilityContract,
  type PageCompatibilityIssue,
} from '../src/services/PageCompatibilityService'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

type MatrixRow = {
  landingPageId: string
  businessId: string
  name: string
  currentPageType: PageTypeKey
  currentLayoutId: string
  enabledCapabilities: string[]
  populatedSlots: string[]
  compatibleLayouts: string[]
  compatiblePageTypes: PageTypeKey[]
  selfCompatible: boolean // is the page compatible with its own current Layout, per its own state?
  selfBlockers: string[] // specifically why (empty when selfCompatible) — kept separate from the
  // full-sweep `blockers` column below, which is the union across the WHOLE catalog per the
  // roadmap's matrix spec and is expected to be noisy (of course Home content doesn't fit Store).
  blockers: string[]
  warnings: string[]
}

function fmtIssues(issues: PageCompatibilityIssue[]): string[] {
  return [
    ...new Map(
      issues.map((i) => [`${i.kind}:${i.key}`, `${i.kind}:${i.key} — ${i.reason}`]),
    ).values(),
  ]
}

async function main() {
  await ensureSystemTemplates(db)
  const contract = await loadPageCompatibilityContract()
  const pageTypeByLayout = new Map(contract.layouts.map((l) => [l.id, l.pageType]))

  const pages = await db.landingPage.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      businessId: true,
      name: true,
      templateId: true,
      content: true,
      formId: true,
      enabledCapabilities: true,
      _count: { select: { adSlots: true } },
    },
  })

  const rows: MatrixRow[] = []

  for (const page of pages) {
    const currentPageType = pageTypeByLayout.get(page.templateId)
    if (!currentPageType) {
      // A page pointing at a template with no contract row at all (e.g. a business-owned custom
      // template — none exist today, but the report should never silently skip one if it did).
      rows.push({
        landingPageId: page.id,
        businessId: page.businessId,
        name: page.name,
        currentPageType: 'LANDING', // placeholder — flagged via blockers below
        currentLayoutId: page.templateId,
        enabledCapabilities: [],
        populatedSlots: [],
        compatibleLayouts: [],
        compatiblePageTypes: [],
        selfCompatible: false,
        selfBlockers: [`Layout "${page.templateId}" has no PageType/contract row at all.`],
        blockers: [`Layout "${page.templateId}" has no PageType/contract row at all.`],
        warnings: [],
      })
      continue
    }

    const state = computePageState({
      content: page.content,
      formId: page.formId,
      enabledCapabilities: page.enabledCapabilities,
      hasAdSlots: page._count.adSlots > 0,
    })

    const allBlockers: PageCompatibilityIssue[] = []
    const allWarnings: PageCompatibilityIssue[] = []
    const compatibleLayouts: string[] = []
    let selfResultBlockers: PageCompatibilityIssue[] = []
    for (const layout of contract.layouts) {
      const result = evaluateLayoutCompatibility(state, layout.id, contract, page.templateId)
      if (result.compatible) compatibleLayouts.push(layout.id)
      if (layout.id === page.templateId) selfResultBlockers = result.blockers
      allBlockers.push(...result.blockers)
      allWarnings.push(...result.warnings)
    }

    const compatiblePageTypes: PageTypeKey[] = []
    for (const pageType of PAGE_TYPE_KEYS) {
      const result = evaluatePageTypeCompatibility(state, pageType, contract, page.templateId)
      if (result.compatible) compatiblePageTypes.push(pageType)
      allBlockers.push(...result.blockers)
      allWarnings.push(...result.warnings)
    }

    rows.push({
      landingPageId: page.id,
      businessId: page.businessId,
      name: page.name,
      currentPageType,
      currentLayoutId: page.templateId,
      enabledCapabilities: [...state.enabledCapabilities].sort(),
      populatedSlots: [...state.populatedSlotGroups].sort(),
      compatibleLayouts: compatibleLayouts.sort(),
      compatiblePageTypes: compatiblePageTypes.sort(),
      selfCompatible: compatibleLayouts.includes(page.templateId),
      selfBlockers: fmtIssues(selfResultBlockers),
      blockers: fmtIssues(allBlockers),
      warnings: fmtIssues(allWarnings),
    })
  }

  const outDir = join(__dirname, 'output')
  mkdirSync(outDir, { recursive: true })
  const jsonPath = join(outDir, 'pageCompatibilityMatrix.json')
  const csvPath = join(outDir, 'pageCompatibilityMatrix.csv')
  writeFileSync(jsonPath, JSON.stringify(rows, null, 2))

  const csvHeader = [
    'landingPageId',
    'businessId',
    'name',
    'currentPageType',
    'currentLayoutId',
    'enabledCapabilities',
    'populatedSlots',
    'compatibleLayouts',
    'compatiblePageTypes',
    'selfCompatible',
    'selfBlockers',
    'blockers',
    'warnings',
  ]
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csvLines = [
    csvHeader.join(','),
    ...rows.map((r) =>
      [
        r.landingPageId,
        r.businessId,
        csvEscape(r.name),
        r.currentPageType,
        r.currentLayoutId,
        csvEscape(r.enabledCapabilities.join('; ')),
        csvEscape(r.populatedSlots.join('; ')),
        csvEscape(r.compatibleLayouts.join('; ')),
        csvEscape(r.compatiblePageTypes.join('; ')),
        r.selfCompatible,
        csvEscape(r.selfBlockers.join(' | ')),
        csvEscape(r.blockers.join(' | ')),
        csvEscape(r.warnings.join(' | ')),
      ].join(','),
    ),
  ]
  writeFileSync(csvPath, csvLines.join('\n'))

  // ---- Summary (the decision-gate signal) ----
  const total = rows.length
  const couldConvert = rows.filter((r) =>
    r.compatiblePageTypes.some((pt) => pt !== r.currentPageType),
  )

  // Active vs. dormant (2026-09-10 correction) — see PageCompatibilityService.ts's own doc
  // comment. selfBlockers can now never be non-empty by construction (a page's own current
  // Layout can't block on its own content), so "self-incompatible" is retired as a headline
  // metric — it would only ever read 0, which is correct but uninteresting on its own; the
  // reason it's correct is the real finding. What's still meaningful: how many pages carry
  // DORMANT (warning-level, harmless-by-design) leftover content vs. how many have real ACTIVE
  // blockers anywhere in the full cross-Layout/cross-PageType sweep (content that's actually
  // rendering today and would be lost switching to some specific other candidate).
  const withDormantContent = rows.filter((r) => r.warnings.length > 0)
  const withActiveBlockersAnywhere = rows.filter((r) => r.blockers.length > 0)
  const provablySelfIncompatible = rows.filter((r) => !r.selfCompatible) // sanity check — must be 0

  console.log(`\nPages Phase 1 compatibility matrix — ${total} pages evaluated\n`)
  console.log(
    `Provably self-incompatible (a page's own current Layout blocking its own content — should always be 0 by construction; non-zero here would mean a real evaluator bug): ${provablySelfIncompatible.length}`,
  )
  console.log(
    `Pages carrying DORMANT content — populated but already not rendered by their own current Layout, harmless leftover data per LOOPIE's intentional "unused slots stay stored" behavior: ${withDormantContent.length}`,
  )
  console.log(
    `Pages with a real ACTIVE blocker somewhere in the full sweep — currently-rendering content that a specific OTHER Layout/PageType could not present: ${withActiveBlockersAnywhere.length}`,
  )
  console.log(
    `Pages that would also fit a Page Type other than their current one: ${couldConvert.length}`,
  )

  console.log(`\nBy current Page Type:`)
  for (const pt of PAGE_TYPE_KEYS) {
    const inType = rows.filter((r) => r.currentPageType === pt)
    if (inType.length === 0) continue
    console.log(
      `  ${pt}: ${inType.length} pages, ${inType.filter((r) => r.warnings.length > 0).length} carrying dormant content, ${inType.filter((r) => r.blockers.length > 0).length} with an active blocker somewhere in the sweep`,
    )
  }

  if (withDormantContent.length > 0) {
    console.log(`\nPages carrying dormant content (sample, up to 10):`)
    for (const r of withDormantContent.slice(0, 10)) {
      console.log(
        `  ${r.landingPageId} (${r.name}) — Layout ${r.currentLayoutId} — dormant: ${r.warnings.slice(0, 3).join(' | ')}`,
      )
    }
  }

  console.log(`\nFull matrix written to:\n  ${jsonPath}\n  ${csvPath}\n`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
