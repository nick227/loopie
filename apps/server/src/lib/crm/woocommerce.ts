import { catalogEntry } from './catalog'
import { jsonFetch } from './http'
import type { CrmContactPage, CrmLiveConnector, CrmOrderPage } from './types'
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '')
  if (isIP(normalized) === 4) {
    return (
      /^127\./.test(normalized) ||
      /^10\./.test(normalized) ||
      /^192\.168\./.test(normalized) ||
      /^169\.254\./.test(normalized) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
      normalized === '0.0.0.0'
    )
  }
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized)
  )
}

export function normalizeWooStoreUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw { statusCode: 400, message: 'Enter a valid WooCommerce store URL' }
  }
  if (url.protocol !== 'https:')
    throw { statusCode: 400, message: 'WooCommerce store URL must use HTTPS' }
  if (url.username || url.password || url.port)
    throw { statusCode: 400, message: 'WooCommerce store URL cannot contain credentials or a port' }
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw { statusCode: 400, message: 'WooCommerce store URL must be publicly reachable' }
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

async function assertPublicStore(store: string) {
  const url = new URL(normalizeWooStoreUrl(store))
  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => [])
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw { statusCode: 400, message: 'WooCommerce store host must resolve to a public address' }
  }
}

function auth(consumerKey: string, consumerSecret?: string) {
  if (!consumerKey || !consumerSecret)
    throw { statusCode: 409, message: 'WooCommerce credentials are incomplete' }
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
}

function endpoint(store: string, resource: string, page: string) {
  const url = new URL(`${normalizeWooStoreUrl(store)}/wp-json/wc/v3/${resource}`)
  url.searchParams.set('per_page', '100')
  url.searchParams.set('page', page)
  return url
}

function nextCursor(rows: unknown[], cursor: string | null) {
  return rows.length === 100 ? String(Number(cursor ?? '1') + 1) : null
}

type OrderCursor = { page: number; since?: string; maxModified?: string }

function parseOrderCursor(raw: string | null): OrderCursor {
  if (!raw) return { page: 1 }
  if (raw.startsWith('checkpoint:')) {
    const since = raw.slice('checkpoint:'.length)
    return { page: 1, since, maxModified: since }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<OrderCursor>
    return {
      page: Number.isFinite(parsed.page) && Number(parsed.page) > 0 ? Number(parsed.page) : 1,
      since: parsed.since,
      maxModified: parsed.maxModified,
    }
  } catch {
    return { page: Number(raw) || 1 }
  }
}

function validWooDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const woocommerceConnector: CrmLiveConnector = {
  provider: 'WOOCOMMERCE',
  capabilities: catalogEntry('WOOCOMMERCE')!.capabilities,
  oauth: false,
  configured: () => true,
  authUrl() {
    throw { statusCode: 400, message: 'WooCommerce uses read-only API keys' }
  },
  async exchangeCode() {
    throw { statusCode: 400, message: 'WooCommerce uses read-only API keys' }
  },
  async listContacts(consumerKey, cursor, opts) {
    await assertPublicStore(opts?.shop ?? '')
    const url = endpoint(opts?.shop ?? '', 'customers', cursor ?? '1')
    // Woo's customers endpoint has no modified-after filter. Stable ID ordering makes a full
    // reconciliation deterministic; source snapshots below still make changed customer fields
    // safe to apply without overwriting local edits.
    url.searchParams.set('orderby', 'id')
    url.searchParams.set('order', 'asc')
    const rows = (await jsonFetch(url.toString(), {
      headers: { Authorization: auth(consumerKey, opts?.secret) },
      redirect: 'error',
      errorLabel: 'WooCommerce customers',
    })) as unknown as Record<string, unknown>[]
    const contacts: CrmContactPage['contacts'] = rows.map((row) => {
      const billing = (row.billing as Record<string, unknown> | undefined) ?? {}
      const name =
        `${row.first_name ?? billing.first_name ?? ''} ${row.last_name ?? billing.last_name ?? ''}`.trim()
      return {
        externalId: `customer:${row.id}`,
        name: name || String(row.email ?? billing.email ?? 'Unknown'),
        email: (row.email as string | null) ?? (billing.email as string | null) ?? null,
        phone: (billing.phone as string | null) ?? null,
        company: (billing.company as string | null) ?? null,
        externalUpdatedAt:
          (row.date_modified_gmt as string | null) ?? (row.date_modified as string | null) ?? null,
        raw: row,
      }
    })
    return { contacts, cursor: nextCursor(rows, cursor) }
  },
  async listOrders(consumerKey, cursor, opts): Promise<CrmOrderPage> {
    await assertPublicStore(opts?.shop ?? '')
    const state = parseOrderCursor(cursor)
    const url = endpoint(opts?.shop ?? '', 'orders', String(state.page))
    url.searchParams.set('status', 'any')
    url.searchParams.set('orderby', 'modified')
    url.searchParams.set('order', 'asc')
    url.searchParams.set('dates_are_gmt', 'true')
    if (state.since) {
      // A one-second overlap protects rows sharing the checkpoint timestamp. External event IDs
      // make the replay harmless and prevent missed late writes at the boundary.
      const overlap = new Date(new Date(state.since).getTime() - 1000).toISOString()
      url.searchParams.set('modified_after', overlap)
    }
    const rows = (await jsonFetch(url.toString(), {
      headers: { Authorization: auth(consumerKey, opts?.secret) },
      redirect: 'error',
      errorLabel: 'WooCommerce orders',
    })) as unknown as Record<string, unknown>[]
    const maxModified = rows.reduce<string | undefined>((latest, row) => {
      const modified =
        validWooDate(row.date_modified_gmt) ?? validWooDate(row.date_modified) ?? undefined
      return !modified || (latest && latest >= modified) ? latest : modified
    }, state.maxModified)
    const orders: CrmOrderPage['orders'] = rows
      .filter((row) => row.status === 'processing' || row.status === 'completed')
      .map((row) => {
        const billing = (row.billing as Record<string, unknown> | undefined) ?? {}
        const customerId = Number(row.customer_id ?? 0)
        const items = (row.line_items as Array<Record<string, unknown>> | undefined) ?? []
        return {
          externalEventId: `order:${row.id}`,
          amount: Number(row.total ?? 0),
          occurredAt:
            (row.date_paid_gmt as string | undefined) ??
            (row.date_created_gmt as string | undefined) ??
            (row.date_created as string | undefined),
          productOrService: items
            .map((item) => String(item.name ?? ''))
            .filter(Boolean)
            .join(', '),
          contact: {
            externalId: customerId > 0 ? `customer:${customerId}` : `guest-order:${row.id}`,
            name:
              `${billing.first_name ?? ''} ${billing.last_name ?? ''}`.trim() ||
              (billing.email as string | undefined),
            email: (billing.email as string | null) ?? null,
            phone: (billing.phone as string | null) ?? null,
          },
          raw: row,
        }
      })
    return {
      orders,
      cursor:
        rows.length === 100
          ? JSON.stringify({ page: state.page + 1, since: state.since, maxModified })
          : null,
      checkpoint: maxModified ? `checkpoint:${maxModified}` : cursor,
    }
  },
}
