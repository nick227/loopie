import type { Contact, SourceType } from '@prisma/client'
import { db } from '@project/db'
import { isUniqueConflict } from './prismaError'
import { scheduleAutomationRuns } from './automationScheduling'
import { matchIdentity, type DbClient } from './identityMatch'
import { fillContactBlanks, syncPrimaryIdentifiers } from './contactIdentifiers'
import { upsertExternalRecord, type ExternalRef } from './externalRecords'

export type { DbClient }
export const OPEN_SLOT = 'OPEN'

export type Attribution = {
  sourceType: SourceType
  sourceMessageId?: string | null
  sourceDeploymentId?: string | null
  sourceAdRunId?: string | null
  sourceAdUnitId?: string | null
  clickId?: string | null
  landingSessionId?: string | null
}

export type ContactInput = {
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  source?: string
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

export type ResolveContactResult =
  | { status: 'resolved'; contact: Contact; created: boolean }
  | { status: 'ambiguous'; candidateIds: string[] }

export async function resolveContact(
  tx: DbClient,
  businessId: string,
  input: ContactInput,
  external?: ExternalRef,
): Promise<ResolveContactResult> {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  const source = input.source ?? 'landing-page'
  const match = await matchIdentity(tx, businessId, {
    email,
    phone,
    externalId: external?.externalId,
    scopeKey: external?.scopeKey,
  })

  if (match.status === 'ambiguous') {
    if (external) {
      await upsertExternalRecord(tx, {
        businessId,
        contactId: null,
        matchStatus: 'AMBIGUOUS',
        candidateContactIds: match.candidateIds,
        ...external,
      })
    }
    return { status: 'ambiguous', candidateIds: match.candidateIds }
  }

  if (match.status === 'resolved') {
    const contact = await fillContactBlanks(
      tx,
      match.contact,
      { name: input.name, email, phone, company: input.company },
      source,
      external?.integrationId,
    )
    if (external) {
      await upsertExternalRecord(tx, {
        businessId,
        contactId: contact.id,
        matchStatus: 'LINKED',
        ...external,
      })
    }
    return { status: 'resolved', contact, created: false }
  }

  try {
    const contact = await tx.contact.create({
      data: {
        businessId,
        name: input.name,
        email,
        phone,
        company: input.company,
        source,
      },
    })
    await syncPrimaryIdentifiers(tx, contact, source, external?.integrationId)
    if (external) {
      await upsertExternalRecord(tx, {
        businessId,
        contactId: contact.id,
        matchStatus: 'LINKED',
        ...external,
      })
    }
    return { status: 'resolved', contact, created: true }
  } catch (err) {
    if (!isUniqueConflict(err)) throw err
    // A concurrent request can create the same Contact between the identity lookup above and
    // this create attempt (e.g. two overlapping webhook/sync deliveries, or a form submission
    // racing an inbound sync, for the same email/phone). Re-reading via `tx` here would not
    // reliably see the winner: MySQL's default REPEATABLE READ isolation fixes a transaction's
    // snapshot at its first read, so a retry read on the *same* transaction can still miss a row
    // the winner already committed by wall-clock time. Retry against the plain `db` client
    // instead — same bounded-retry convention as SaleService.create()'s idempotency handling —
    // so a losing concurrent request reliably observes the winner once it has actually
    // committed, rather than surfacing a raw unique-constraint error to the caller.
    let raced: Awaited<ReturnType<typeof matchIdentity>> | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      raced = await matchIdentity(db, businessId, { email, phone })
      if (raced.status === 'resolved') break
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 10))
    }
    if (!raced || raced.status !== 'resolved') throw err
    if (external) {
      await upsertExternalRecord(db, {
        businessId,
        contactId: raced.contact.id,
        matchStatus: 'LINKED',
        ...external,
      })
    }
    return { status: 'resolved', contact: raced.contact, created: false }
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
        sourceAdRunId: attribution.sourceAdRunId ?? null,
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

export async function resolveContactAndLead(
  tx: DbClient,
  businessId: string,
  contactInput: ContactInput,
  attribution: Attribution,
) {
  const resolved = await resolveContact(tx, businessId, contactInput)
  if (resolved.status === 'ambiguous') {
    throw {
      statusCode: 409,
      message: 'Ambiguous contact match — email and phone belong to different people',
    }
  }
  const contact = resolved.contact
  const { lead, created } = await insertOrReuseOpenLead(tx, businessId, contact.id, attribution)

  if (created && attribution.landingSessionId) {
    const click = await tx.affiliateReferralClick.findFirst({
      where: { sessionId: attribution.landingSessionId },
      orderBy: { clickedAt: 'desc' },
    })
    if (click) {
      await tx.lead.update({
        where: { id: lead.id },
        data: { referringAffiliateId: click.affiliateId },
      })
    }
  }

  await tx.interaction.create({
    data: {
      businessId,
      contactId: contact.id,
      type: 'FORM_SUBMITTED',
      sourceType: attribution.sourceType,
      sourceDeploymentId: attribution.sourceDeploymentId ?? null,
      sourceAdRunId: attribution.sourceAdRunId ?? null,
      sourceAdUnitId: attribution.sourceAdUnitId ?? null,
    },
  })

  if (created) {
    await scheduleAutomationRuns(tx, {
      businessId,
      trigger: 'LEAD_CREATED',
      contactId: contact.id,
      leadId: lead.id,
      triggerSourceId: lead.id,
      triggerEventAt: lead.openedAt,
    })
  }

  return { contact, lead, leadCreated: created }
}
