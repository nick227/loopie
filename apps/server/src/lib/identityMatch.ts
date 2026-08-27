import type { Contact, Prisma } from '@prisma/client'

export type DbClient = Prisma.TransactionClient

export type IdentityKeys = {
  email?: string | null
  phone?: string | null
  externalId?: string | null
  scopeKey?: string | null
}

export type MatchResult =
  | { status: 'none' }
  | { status: 'resolved'; contact: Contact }
  | { status: 'ambiguous'; candidateIds: string[] }

async function liveContact(tx: DbClient, businessId: string, contactId: string) {
  return tx.contact.findFirst({ where: { id: contactId, businessId, deletedAt: null } })
}

export async function findByExternalId(
  tx: DbClient,
  businessId: string,
  scopeKey: string,
  externalId: string,
) {
  const record = await tx.externalContactRecord.findUnique({
    where: { scopeKey_externalId: { scopeKey, externalId } },
  })
  if (!record?.contactId) return null
  return liveContact(tx, businessId, record.contactId)
}

async function findByIdentifier(
  tx: DbClient,
  businessId: string,
  kind: 'EMAIL' | 'PHONE',
  value: string,
) {
  const ident = await tx.contactIdentifier.findUnique({
    where: { businessId_kind_normalizedValue: { businessId, kind, normalizedValue: value } },
  })
  if (ident) return liveContact(tx, businessId, ident.contactId)
  if (kind === 'EMAIL') {
    return tx.contact.findFirst({ where: { businessId, email: value, deletedAt: null } })
  }
  return tx.contact.findFirst({ where: { businessId, phone: value, deletedAt: null } })
}

export async function matchIdentity(
  tx: DbClient,
  businessId: string,
  keys: IdentityKeys,
): Promise<MatchResult> {
  // An externalId match is a strong candidate, but it must not short-circuit the email/phone
  // conflict check below — a re-synced row can carry an externalId pointing at one Contact
  // while its email or phone canonically belongs to a different one (e.g. two people sharing an
  // externalId source-of-truth key, or a stale externalId link left over from a prior merge).
  // Enriching the externalId match in that case would silently misattribute the other
  // identifier's data onto the wrong Contact, so any disagreement goes through the ambiguous
  // path instead of being resolved automatically.
  const byExt =
    keys.scopeKey && keys.externalId
      ? await findByExternalId(tx, businessId, keys.scopeKey, keys.externalId)
      : null
  const byEmail = keys.email ? await findByIdentifier(tx, businessId, 'EMAIL', keys.email) : null
  const byPhone = keys.phone ? await findByIdentifier(tx, businessId, 'PHONE', keys.phone) : null

  const candidateIds = [
    ...new Set([byExt?.id, byEmail?.id, byPhone?.id].filter((id): id is string => !!id)),
  ]

  if (candidateIds.length > 1) {
    return { status: 'ambiguous', candidateIds }
  }
  if (byExt) return { status: 'resolved', contact: byExt }
  if (byEmail) return { status: 'resolved', contact: byEmail }
  if (byPhone) return { status: 'resolved', contact: byPhone }
  return { status: 'none' }
}
