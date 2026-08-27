import { Prisma, LeadStage } from '@prisma/client'
import { provenanceFor } from './crm/fieldAuthority'

// Shared between ContactService and AudienceService so both compute the same
// derived lifecycleStatus without duplicating the include shape. `satisfies` (not `as const`)
// keeps the literal shape for Prisma's payload-type inference below while still checking it
// against Prisma.ContactInclude — `as const` would make the notIn array readonly, which
// Prisma's generated where-input types (LeadStage[], mutable) reject.
export const LIFECYCLE_INCLUDE = {
  sales: { take: 1, select: { id: true } },
  leads: {
    where: { stage: { notIn: [LeadStage.WON, LeadStage.LOST] } },
    take: 1,
    select: { id: true },
  },
} satisfies Prisma.ContactInclude

type ContactWithLifecycle = Prisma.ContactGetPayload<{ include: typeof LIFECYCLE_INCLUDE }>

function lifecycleStatus(
  contact: Pick<ContactWithLifecycle, 'sales' | 'leads'>,
): 'LEAD' | 'CUSTOMER' | 'NONE' {
  if (contact.sales.length > 0) return 'CUSTOMER'
  if (contact.leads.length > 0) return 'LEAD'
  return 'NONE'
}

export function toContactDTO(contact: ContactWithLifecycle) {
  return {
    id: contact.id,
    businessId: contact.businessId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    source: contact.source,
    tags: (contact.tags as string[] | null) ?? [],
    emailEligible: contact.emailEligible,
    smsEligible: contact.smsEligible,
    lastContactedAt: contact.lastContactedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    lifecycleStatus: lifecycleStatus(contact),
  }
}

export function withGraph(
  contact: ContactWithLifecycle,
  extras: {
    identifiers: {
      kind: 'EMAIL' | 'PHONE'
      normalizedValue: string
      source: string
      isPrimary: boolean
    }[]
    records: {
      id: string
      provider: string
      externalId: string
      matchStatus: string
      syncedAt: Date | null
    }[]
    revenue: number
    profiles?: Record<string, Record<string, string>>
  },
) {
  return {
    ...toContactDTO(contact),
    provenance: provenanceFor(contact, extras.identifiers),
    records: extras.records.map((row) => ({
      id: row.id,
      provider: row.provider,
      externalId: row.externalId,
      matchStatus: row.matchStatus,
      syncedAt: row.syncedAt?.toISOString() ?? null,
      profile: extras.profiles?.[row.id],
    })),
    revenue: extras.revenue,
  }
}
