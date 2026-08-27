import { db } from '@project/db'
import { csvScope } from '../lib/crm/catalog'
import { normalizeEmail, normalizePhone, resolveContact } from '../lib/identityResolution'

export type ImportRow = {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: string
  tags?: string[]
  emailEligible?: boolean
  smsEligible?: boolean
  externalId?: string
}

export class ImportJobService {
  async importContacts(businessId: string, contacts: ImportRow[]) {
    const job = await db.importJob.create({ data: { businessId, status: 'PENDING' } })
    let created = 0
    let linked = 0
    let ambiguous = 0
    let skipped = 0
    const scopeKey = csvScope(businessId)

    for (const row of contacts) {
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
            raw: row,
          },
        ),
      )
      if (result.status === 'ambiguous') {
        ambiguous++
        continue
      }
      if (result.created) created++
      else linked++
      if (row.tags || row.emailEligible !== undefined || row.smsEligible !== undefined) {
        await db.contact.update({
          where: { id: result.contact.id },
          data: {
            ...(row.tags ? { tags: row.tags } : {}),
            ...(row.emailEligible !== undefined ? { emailEligible: row.emailEligible } : {}),
            ...(row.smsEligible !== undefined ? { smsEligible: row.smsEligible } : {}),
          },
        })
      }
    }

    await db.importJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', created, linked, ambiguous, skipped },
    })
    return { importJobId: job.id, created, linked, ambiguous, skipped }
  }
}
