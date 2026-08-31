import { db } from '@project/db'
// Relative path, not the '@project/sdk' package specifier — see AdRunService.ts's identical
// import for why (found live: MODULE_NOT_FOUND in the Railway runtime image despite the file
// physically being present, specific to this package's #exports-map package.json).
import { normalizeImportContact } from '../../../../packages/sdk/src/lib/importContactSchema'
import { csvScope } from '../lib/crm/catalog'
import { normalizeEmail, normalizePhone, resolveContact } from '../lib/identityResolution'

export class ImportJobService {
  async importContacts(businessId: string, contacts: Record<string, unknown>[]) {
    const job = await db.importJob.create({ data: { businessId, status: 'PENDING' } })
    let created = 0
    let linked = 0
    let ambiguous = 0
    let skipped = 0
    const scopeKey = csvScope(businessId)

    for (const original of contacts) {
      const row = normalizeImportContact(original)
      const email = normalizeEmail(row.email)
      const phone = normalizePhone(row.phone)
      const externalId = row.externalId ?? email ?? phone
      if (!externalId) {
        skipped++
        continue
      }
      const result = await db.$transaction((tx) =>
        resolveContact(
          tx,
          businessId,
          {
            name: row.name,
            email,
            phone,
            company: row.company,
            source: row.source ?? 'CSV',
          },
          {
            provider: 'CSV',
            externalId,
            scopeKey,
            importJobId: job.id,
            raw: { ...original, profile: row.profile ?? null },
          },
        ),
      )
      if (result.status === 'ambiguous') {
        ambiguous++
        continue
      }
      if (result.created) {
        created++
        await db.contact.update({
          where: { id: result.contact.id },
          data: {
            ...(row.tags ? { tags: row.tags } : {}),
            ...(row.emailEligible !== undefined ? { emailEligible: row.emailEligible } : {}),
            ...(row.smsEligible !== undefined ? { smsEligible: row.smsEligible } : {}),
          },
        })
      } else linked++
    }

    await db.importJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', created, linked, ambiguous, skipped },
    })
    return { importJobId: job.id, created, linked, ambiguous, skipped }
  }
}
