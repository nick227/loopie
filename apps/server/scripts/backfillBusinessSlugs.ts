// One-time backfill for the public business profile slice (see CLAUDE.md's dated entry):
// Business.slug is nullable only because pre-existing rows predate the column — new businesses
// get one automatically via AuthService.register. This assigns a unique slug to every row still
// missing one, idempotent (a re-run is a no-op for already-backfilled rows).
//
// Usage: DATABASE_URL=... pnpm --filter server exec tsx scripts/backfillBusinessSlugs.ts
import { db } from '@project/db'
import { nextUniqueBusinessSlug } from '../src/lib/businessSlug'

async function main() {
  const businesses = await db.business.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  })

  for (const business of businesses) {
    const slug = await nextUniqueBusinessSlug(db, business.name)
    await db.business.update({ where: { id: business.id }, data: { slug } })
    console.log(`${business.id} -> ${slug}`)
  }

  console.log(`Businesses backfilled: ${businesses.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
