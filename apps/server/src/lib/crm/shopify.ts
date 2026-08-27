import { catalogEntry } from './catalog'
import { formBody, jsonFetch } from './http'
import type { CrmLiveConnector, CrmContactPage, CrmOrderPage, CrmToken } from './types'

const SCOPES = 'read_customers,read_orders'
const API = '2024-10'

export function normalizeShop(raw: string) {
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  if (!host) throw { statusCode: 400, message: 'Shopify shop domain is required' }
  if (!host.includes('.')) return `${host}.myshopify.com`
  if (!host.endsWith('.myshopify.com'))
    throw { statusCode: 400, message: 'Shop must be a myshopify.com domain' }
  return host
}

function requireConfig() {
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  const redirectUri =
    process.env.SHOPIFY_REDIRECT_URI ??
    `${process.env.TRACKING_BASE_URL ?? 'http://localhost:3001'}/integrations/SHOPIFY/oauth/callback`
  if (!clientId || !clientSecret) throw { statusCode: 503, message: 'Shopify is not configured' }
  return { clientId, clientSecret, redirectUri }
}

function money(order: Record<string, unknown>) {
  const raw = order.total_price ?? order.current_total_price
  const amount = Number(raw ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

export const shopifyConnector: CrmLiveConnector = {
  provider: 'SHOPIFY',
  capabilities: catalogEntry('SHOPIFY')!.capabilities,
  oauth: true,
  configured: () => Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET),
  authUrl(state, opts) {
    const shop = normalizeShop(opts?.shop ?? '')
    const { clientId, redirectUri } = requireConfig()
    const url = new URL(`https://${shop}/admin/oauth/authorize`)
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    return url.toString()
  },
  async exchangeCode(code, opts) {
    const shop = normalizeShop(opts?.shop ?? '')
    const { clientId, clientSecret } = requireConfig()
    const json = await jsonFetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({ client_id: clientId, client_secret: clientSecret, code }),
      errorLabel: 'Shopify token',
    })
    return {
      accessToken: String(json.access_token ?? ''),
      externalAccountId: shop,
    } satisfies CrmToken
  },
  async listContacts(token, cursor, opts) {
    const shop = normalizeShop(opts?.shop ?? '')
    const url = new URL(`https://${shop}/admin/api/${API}/customers.json`)
    url.searchParams.set('limit', '50')
    if (cursor) url.searchParams.set('since_id', cursor)
    const json = await jsonFetch(url.toString(), {
      headers: { 'X-Shopify-Access-Token': token },
      errorLabel: 'Shopify customers',
    })
    const rows = (json.customers as Record<string, unknown>[] | undefined) ?? []
    const contacts: CrmContactPage['contacts'] = rows.map((row) => {
      const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
      return {
        externalId: String(row.id ?? ''),
        name: name || String(row.email ?? 'Unknown'),
        email: (row.email as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        company: (row.default_address as { company?: string } | undefined)?.company ?? null,
        raw: row,
      }
    })
    const last = rows[rows.length - 1]
    return { contacts, cursor: rows.length === 50 && last ? String(last.id) : null }
  },
  async listOrders(token, cursor, opts): Promise<CrmOrderPage> {
    const shop = normalizeShop(opts?.shop ?? '')
    const url = new URL(`https://${shop}/admin/api/${API}/orders.json`)
    url.searchParams.set('status', 'any')
    url.searchParams.set('limit', '50')
    if (cursor) url.searchParams.set('since_id', cursor)
    const json = await jsonFetch(url.toString(), {
      headers: { 'X-Shopify-Access-Token': token },
      errorLabel: 'Shopify orders',
    })
    const rows = (json.orders as Record<string, unknown>[] | undefined) ?? []
    const orders: CrmOrderPage['orders'] = rows
      .map((row) => {
        const customer = (row.customer as Record<string, unknown> | undefined) ?? {}
        return {
          externalEventId: `order:${row.id}`,
          amount: money(row),
          occurredAt: typeof row.created_at === 'string' ? row.created_at : undefined,
          productOrService: typeof row.name === 'string' ? row.name : undefined,
          contact: {
            externalId: customer.id != null ? String(customer.id) : undefined,
            name:
              `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
              (customer.email as string | undefined),
            email: (customer.email as string | null) ?? null,
            phone: (customer.phone as string | null) ?? null,
          },
          raw: row,
        }
      })
      .filter((row) => row.amount > 0)
    const last = rows[rows.length - 1]
    return { orders, cursor: rows.length === 50 && last ? String(last.id) : null }
  },
}
