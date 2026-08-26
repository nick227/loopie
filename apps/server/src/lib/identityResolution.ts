import type { Prisma, SourceType } from '@prisma/client'
import { isUniqueConflict } from './prismaError'

export const OPEN_SLOT = 'OPEN'

export type DbClient = Prisma.TransactionClient

export type Attribution = {
  sourceType: SourceType
  sourceMessageId?: string | null
  sourceDeploymentId?: string | null
  sourceAdUnitId?: string | null
  clickId?: string | null
  landingSessionId?: string | null
}

export function normalizeEmail(value?: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim().toLowerCase()
  return trimmed === '' ? null : trimmed
}

export function normalizePhone(value?: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function tombstoneIdentity(value: string | null, id: string): string | null {
  if (!value) return null
  return `deleted:${id}:${value}`
}

async function findLiveContact(
  tx: DbClient,
  businessId: string,
  email: string | null,
  phone: string | null,
) {
  if (email) {
    const byEmail = await tx.contact.findFirst({ where: { businessId, email, deletedAt: null } })
    if (byEmail) return byEmail
  }
  if (phone) {
    return tx.contact.findFirst({ where: { businessId, phone, deletedAt: null } })
  }
  return null
}

async function insertOrReuseContact(
  tx: DbClient,
  businessId: string,
  input: { name: string; email: string | null; phone: string | null; source?: string },
) {
  const existing = await findLiveContact(tx, businessId, input.email, input.phone)
  if (existing) return existing

  try {
    return await tx.contact.create({
      data: {
        businessId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        source: input.source ?? 'landing-page',
      },
    })
  } catch (err) {
    if (!isUniqueConflict(err)) throw err
    const raced = await findLiveContact(tx, businessId, input.email, input.phone)
    if (!raced) throw err
    return raced
  }
}

async function insertOrReuseOpenLead(
  tx: DbClient,
  businessId: string,
  contactId: string,
  attribution: Attribution,
) {
  const open = await tx.lead.findFirst({ where: { contactId, openSlot: OPEN_SLOT } })
  if (open) return { lead: open, created: false }

  try {
    const lead = await tx.lead.create({
      data: {
        businessId,
        contactId,
        sourceType: attribution.sourceType,
        sourceMessageId: attribution.sourceMessageId ?? null,
        sourceDeploymentId: attribution.sourceDeploymentId ?? null,
        sourceAdUnitId: attribution.sourceAdUnitId ?? null,
        clickId: attribution.clickId ?? null,
        landingSessionId: attribution.landingSessionId ?? null,
        openSlot: OPEN_SLOT,
      },
    })
    return { lead, created: true }
  } catch (err) {
    if (!isUniqueConflict(err)) throw err
    const raced = await tx.lead.findFirst({ where: { contactId, openSlot: OPEN_SLOT } })
    if (!raced) throw err
    return { lead: raced, created: false }
  }
}

// Canonical identity transition: anonymous -> Contact -> one open Lead.
// Callers must run this inside db.$transaction so submit/sale stay atomic with it.
export async function resolveContactAndLead(
  tx: DbClient,
  businessId: string,
  contactInput: { name: string; email?: string | null; phone?: string | null; source?: string },
  attribution: Attribution,
) {
  const email = normalizeEmail(contactInput.email)
  const phone = normalizePhone(contactInput.phone)
  const contact = await insertOrReuseContact(tx, businessId, {
    name: contactInput.name,
    email,
    phone,
    source: contactInput.source,
  })

  const { lead } = await insertOrReuseOpenLead(tx, businessId, contact.id, attribution)

  await tx.interaction.create({
    data: {
      businessId,
      contactId: contact.id,
      type: 'FORM_SUBMITTED',
      sourceType: attribution.sourceType,
      sourceDeploymentId: attribution.sourceDeploymentId ?? null,
      sourceAdUnitId: attribution.sourceAdUnitId ?? null,
    },
  })

  return { contact, lead }
}
