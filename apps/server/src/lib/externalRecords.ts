import type { CrmProvider, ExternalMatchStatus, Prisma } from '@prisma/client'
import type { DbClient } from './identityMatch'

export type ExternalRef = {
  provider: string
  externalId: string
  scopeKey: string
  integrationId?: string | null
  importJobId?: string | null
  externalUpdatedAt?: string | null
  sourceSnapshot?: {
    name?: string | null
    email?: string | null
    phone?: string | null
    company?: string | null
  }
  raw?: unknown
}

export async function upsertExternalRecord(
  tx: DbClient,
  input: ExternalRef & {
    businessId: string
    contactId: string | null
    matchStatus: ExternalMatchStatus
    candidateContactIds?: string[]
  },
) {
  const data = {
    businessId: input.businessId,
    contactId: input.contactId,
    integrationId: input.integrationId ?? null,
    importJobId: input.importJobId ?? null,
    provider: input.provider as CrmProvider,
    externalId: input.externalId,
    scopeKey: input.scopeKey,
    matchStatus: input.matchStatus,
    candidateContactIds: (input.candidateContactIds ?? undefined) as
      Prisma.InputJsonValue | undefined,
    externalUpdatedAt: input.externalUpdatedAt ? new Date(input.externalUpdatedAt) : null,
    syncedAt: new Date(),
    raw: (input.raw ?? undefined) as Prisma.InputJsonValue | undefined,
    sourceSnapshot: (input.sourceSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
  }
  return tx.externalContactRecord.upsert({
    where: { scopeKey_externalId: { scopeKey: input.scopeKey, externalId: input.externalId } },
    create: data,
    update: {
      contactId: data.contactId,
      matchStatus: data.matchStatus,
      candidateContactIds: data.candidateContactIds,
      externalUpdatedAt: data.externalUpdatedAt,
      syncedAt: data.syncedAt,
      importJobId: data.importJobId,
      raw: data.raw,
      sourceSnapshot: data.sourceSnapshot,
    },
  })
}
