// One-time backfill: migrates Contact.tags (legacy JSON string[]) into the new ContactTag /
// ContactTagAssignment catalog (see CLAUDE.md's structured-tags CRM slice). Run once per database
// before the application code switches to reading/writing the catalog exclusively, and again
// safely any time after — syncContactTags is a full-replace, so a second run against the same
// legacy data is a no-op, not a duplicate.
//
// Usage: DATABASE_URL=... pnpm --filter server exec tsx scripts/backfillContactTags.ts
import { db } from '@project/db'
import { syncContactTags } from '../src/lib/contactTags'

async function main() {
  const contacts = await db.contact.findMany({
    where: { tags: { not: null } },
    select: { id: true, businessId: true, tags: true },
  })

  let processed = 0
  let skippedEmpty = 0
  for (const contact of contacts) {
    const names = (contact.tags as unknown as string[] | null) ?? []
    if (names.length === 0) {
      skippedEmpty++
      continue
    }
    await syncContactTags(db, contact.businessId, contact.id, names)
    processed++
  }

  const tagCount = await db.contactTag.count()
  const assignmentCount = await db.contactTagAssignment.count()

  console.log(
    [
      `Contacts with a non-null tags column: ${contacts.length}`,
      `Contacts with at least one real tag, migrated: ${processed}`,
      `Contacts with an empty tags array, skipped: ${skippedEmpty}`,
      `ContactTag rows now in the catalog: ${tagCount}`,
      `ContactTagAssignment rows now in place: ${assignmentCount}`,
    ].join('\n'),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
