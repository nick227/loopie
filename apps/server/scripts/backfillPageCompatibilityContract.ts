// Pages Phase 0 + Phase 1 backfill (2026-09-10) — see
// docs/strategy/pages-page-types-and-style-axes-roadmap.md and
// docs/strategy/pages-and-ads-shared-catalog-boundary.md.
//
// One-time (but safely repeatable — every write is an idempotent upsert) backfill: seeds the
// shared Capability/Genre vocabulary, the static PageType x Capability requirement matrix, and
// each existing system Layout's own derived capability/slot support — the same work
// ensureSystemTemplates() now does lazily on every relevant request, run here explicitly so
// `LandingPageTemplate.pageType` can be backfilled once before the column is tightened from
// nullable to required.
//
// Usage: tsx --env-file=../../.env scripts/backfillPageCompatibilityContract.ts
import { db } from '@project/db'
import { ensureSystemTemplates } from '../src/lib/ensureSystemTemplates'

async function main() {
  await ensureSystemTemplates(db)
  // pageType has been a required (defaulted) column since Phase 1 — nothing to check for null
  // anymore. Print the current mapping instead, useful whenever a Page Type gets added/split.
  const rows = await db.landingPageTemplate.findMany({
    where: { isSystem: true },
    select: { id: true, pageType: true },
    orderBy: { id: 'asc' },
  })
  console.log('ensureSystemTemplates ran. System Layout -> PageType:')
  for (const row of rows) console.log(`  ${row.id} -> ${row.pageType}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
