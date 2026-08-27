import { db } from '@project/db'
import type { CrmProvider, IntegrationStatus } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { catalogEntry } from '../lib/crm/catalog'
import { getCrmConnector, listCrmConnectors } from '../lib/crm/registry'

async function lastJob(integrationId: string) {
  const record = await db.externalContactRecord.findFirst({
    where: { integrationId, importJobId: { not: null } },
    orderBy: { syncedAt: 'desc' },
    select: {
      importJob: { select: { created: true, linked: true, ambiguous: true, skipped: true } },
    },
  })
  return record?.importJob ?? null
}

async function toDTO(row: {
  id: string
  businessId: string
  provider: CrmProvider
  label: string | null
  externalAccountId: string | null
  status: IntegrationStatus
  syncDirection: string
  lastSyncAt: Date | null
  capabilities: unknown
  createdAt: Date
  credentialsEnc: string | null
}) {
  const catalog = catalogEntry(row.provider)
  const connector = getCrmConnector(row.provider)
  const job = await lastJob(row.id)
  return {
    id: row.id,
    businessId: row.businessId,
    provider: row.provider,
    label: row.label ?? catalog?.label ?? row.provider,
    externalAccountId: row.externalAccountId,
    status: row.status,
    syncDirection: row.syncDirection,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastSyncCreated: job?.created ?? null,
    lastSyncLinked: job?.linked ?? null,
    lastSyncAmbiguous: job?.ambiguous ?? null,
    lastSyncSkipped: job?.skipped ?? null,
    capabilities: row.capabilities,
    oauth: connector.oauth,
    configured: connector.configured(),
    createdAt: row.createdAt.toISOString(),
  }
}

export class IntegrationService {
  async catalog(businessId: string) {
    const unresolvedMatchCount = await db.externalContactRecord.count({
      where: { businessId, matchStatus: { in: ['AMBIGUOUS', 'UNMATCHED'] } },
    })
    return { data: listCrmConnectors(), unresolvedMatchCount }
  }

  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: object[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const rows = await db.integration.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: await Promise.all(items.map(toDTO)), meta: { hasMore, nextCursor } }
  }

  async get(businessId: string, integrationId: string) {
    const row = await db.integration.findFirst({ where: { id: integrationId, businessId } })
    if (!row) throw { statusCode: 404, message: 'Integration not found' }
    return toDTO(row)
  }

  async create(
    businessId: string,
    data: { provider: string; label?: string; externalAccountId?: string },
  ) {
    if (data.provider === 'CSV')
      throw { statusCode: 400, message: 'CSV is an import, not an Integration' }
    const entry = catalogEntry(data.provider)
    if (!entry) throw { statusCode: 400, message: 'Unknown CRM provider' }
    const connector = getCrmConnector(entry.provider)
    if (connector.oauth && connector.configured()) {
      throw { statusCode: 400, message: 'Connect this provider with OAuth' }
    }
    const row = await db.integration.create({
      data: {
        businessId,
        provider: entry.provider,
        label: data.label ?? entry.label,
        externalAccountId: data.externalAccountId ?? null,
        status: 'CONNECTED',
        capabilities: entry.capabilities as object,
      },
    })
    return toDTO(row)
  }

  async update(
    businessId: string,
    integrationId: string,
    data: { status?: IntegrationStatus; label?: string },
  ) {
    await this.get(businessId, integrationId)
    const row = await db.integration.update({
      where: { id: integrationId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
      },
    })
    return toDTO(row)
  }
}
