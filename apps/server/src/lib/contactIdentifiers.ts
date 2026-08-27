import type { Contact } from '@prisma/client'
import { isUniqueConflict } from './prismaError'
import type { DbClient } from './identityMatch'
import { isPlaceholderName } from './crm/fieldAuthority'

export async function ensureIdentifier(
  tx: DbClient,
  input: {
    businessId: string
    contactId: string
    kind: 'EMAIL' | 'PHONE'
    normalizedValue: string
    source: string
    integrationId?: string | null
    isPrimary?: boolean
  },
) {
  try {
    await tx.contactIdentifier.create({
      data: {
        businessId: input.businessId,
        contactId: input.contactId,
        kind: input.kind,
        normalizedValue: input.normalizedValue,
        source: input.source,
        integrationId: input.integrationId ?? null,
        isPrimary: input.isPrimary ?? false,
      },
    })
  } catch (err) {
    if (!isUniqueConflict(err)) throw err
  }
}

export async function syncPrimaryIdentifiers(
  tx: DbClient,
  contact: Contact,
  source: string,
  integrationId?: string | null,
) {
  if (contact.email) {
    await ensureIdentifier(tx, {
      businessId: contact.businessId,
      contactId: contact.id,
      kind: 'EMAIL',
      normalizedValue: contact.email,
      source,
      integrationId,
      isPrimary: true,
    })
  }
  if (contact.phone) {
    await ensureIdentifier(tx, {
      businessId: contact.businessId,
      contactId: contact.id,
      kind: 'PHONE',
      normalizedValue: contact.phone,
      source,
      integrationId,
      isPrimary: true,
    })
  }
}

export async function fillContactBlanks(
  tx: DbClient,
  contact: Contact,
  input: {
    name?: string | null
    email: string | null
    phone: string | null
    company?: string | null
  },
  source: string,
  integrationId?: string | null,
) {
  const data: { name?: string; email?: string; phone?: string; company?: string } = {}
  if (isPlaceholderName(contact.name) && input.name && !isPlaceholderName(input.name)) {
    data.name = input.name
  }
  if (!contact.email && input.email) data.email = input.email
  if (!contact.phone && input.phone) data.phone = input.phone
  if (!contact.company && input.company) data.company = input.company
  const next =
    Object.keys(data).length === 0
      ? contact
      : await tx.contact.update({ where: { id: contact.id }, data })
  if (input.email) {
    await ensureIdentifier(tx, {
      businessId: next.businessId,
      contactId: next.id,
      kind: 'EMAIL',
      normalizedValue: input.email,
      source,
      integrationId,
      isPrimary: !next.email || next.email === input.email,
    })
  }
  if (input.phone) {
    await ensureIdentifier(tx, {
      businessId: next.businessId,
      contactId: next.id,
      kind: 'PHONE',
      normalizedValue: input.phone,
      source,
      integrationId,
      isPrimary: !next.phone || next.phone === input.phone,
    })
  }
  return next
}

export async function tombstoneIdentifiers(tx: DbClient, contactId: string) {
  const idents = await tx.contactIdentifier.findMany({ where: { contactId } })
  for (const ident of idents) {
    await tx.contactIdentifier.update({
      where: { id: ident.id },
      data: { normalizedValue: `deleted:${contactId}:${ident.normalizedValue}` },
    })
  }
}
