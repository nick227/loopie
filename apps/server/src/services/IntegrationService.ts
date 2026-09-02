import { db } from '@project/db'
import type { CrmProvider, IntegrationStatus } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { catalogEntry } from '../lib/crm/catalog'
import { getCrmConnector, listCrmConnectors } from '../lib/crm/registry'
import { normalizeWooStoreUrl } from '../lib/crm/woocommerce'
import { writeCreds } from './CrmOAuthService'
import { randomBytes } from 'node:crypto'

function inboundWebhookUrl(integrationId: string) {
  const base = (process.env.TRACKING_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
  return `${base}/webhooks/inbound/${integrationId}`
}

async function lastJob(integrationId: string) {
  return db.importJob.findFirst({
    where: { integrationId },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      created: true,
      linked: true,
      ambiguous: true,
      skipped: true,
      error: true,
      updatedAt: true,
    },
  })
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
  lastSyncAttemptAt: Date | null
  lastSyncError: string | null
  syncHasMore: boolean
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
    lastSuccessfulSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastSyncAttemptAt: row.lastSyncAttemptAt?.toISOString() ?? null,
    lastSyncError: row.lastSyncError,
    syncHasMore: row.syncHasMore,
    lastSyncStatus: job?.status ?? null,
    lastSyncJobAt: job?.updatedAt.toISOString() ?? null,
    lastSyncCreated: job?.created ?? null,
    lastSyncLinked: job?.linked ?? null,
    lastSyncAmbiguous: job?.ambiguous ?? null,
    lastSyncSkipped: job?.skipped ?? null,
    capabilities: row.capabilities,
    oauth: connector.oauth,
    configured: connector.configured(),
    webhookUrl: row.provider === 'WEBHOOK' ? inboundWebhookUrl(row.id) : null,
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
    data: {
      provider: string
      label?: string
      externalAccountId?: string
      storeUrl?: string
      consumerKey?: string
      consumerSecret?: string
    },
  ) {
    if (data.provider === 'CSV')
      throw { statusCode: 400, message: 'CSV is an import, not an Integration' }
    const entry = catalogEntry(data.provider)
    if (!entry) throw { statusCode: 400, message: 'Unknown CRM provider' }
    const connector = getCrmConnector(entry.provider)
    if (connector.availability !== 'LIVE' || (!connector.live && entry.provider !== 'WEBHOOK')) {
      throw { statusCode: 501, message: `${entry.label} is coming soon` }
    }
    if (connector.oauth && connector.configured()) {
      throw { statusCode: 400, message: 'Connect this provider with OAuth' }
    }
    if (connector.oauth && !connector.configured()) {
      throw { statusCode: 503, message: `${entry.label} is not configured` }
    }

    let externalAccountId = data.externalAccountId ?? null
    let credentialsEnc: string | null = null
    let webhookSecret: string | null = null
    if (entry.provider === 'WOOCOMMERCE') {
      const storeUrl = normalizeWooStoreUrl(data.storeUrl ?? '')
      const consumerKey = data.consumerKey?.trim() ?? ''
      const consumerSecret = data.consumerSecret?.trim() ?? ''
      if (!consumerKey.startsWith('ck_') || !consumerSecret.startsWith('cs_')) {
        throw { statusCode: 400, message: 'Enter a valid WooCommerce consumer key and secret' }
      }
      // Verify read access before presenting the integration as connected.
      await connector.live!.listContacts(consumerKey, null, {
        shop: storeUrl,
        secret: consumerSecret,
      })
      externalAccountId = storeUrl
      credentialsEnc = writeCreds({
        accessToken: consumerKey,
        consumerSecret,
        shop: storeUrl,
      })
    }
    if (entry.provider === 'WEBHOOK') {
      webhookSecret = `whsec_${randomBytes(24).toString('base64url')}`
      externalAccountId = `inbound_${randomBytes(12).toString('hex')}`
      credentialsEnc = writeCreds({ accessToken: webhookSecret })
    }
    if (!externalAccountId) {
      throw { statusCode: 400, message: `${entry.label} account identifier is required` }
    }

    const row = await db.integration.upsert({
      where: {
        businessId_provider_externalAccountId: {
          businessId,
          provider: entry.provider,
          externalAccountId,
        },
      },
      create: {
        businessId,
        provider: entry.provider,
        label: data.label ?? entry.label,
        externalAccountId,
        status: 'CONNECTED',
        capabilities: entry.capabilities as object,
        credentialsEnc,
      },
      update: {
        label: data.label ?? entry.label,
        status: 'CONNECTED',
        capabilities: entry.capabilities as object,
        credentialsEnc,
      },
    })
    const dto = await toDTO(row)
    return webhookSecret ? { ...dto, webhookSecret } : dto
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

  async disconnect(businessId: string, integrationId: string) {
    await this.get(businessId, integrationId)
    const row = await db.integration.update({
      where: { id: integrationId },
      data: {
        status: 'PAUSED',
        credentialsEnc: null,
        externalAccountId: null,
      },
    })
    return toDTO(row)
  }
}
