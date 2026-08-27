import { catalogEntry } from './catalog'
import { formBody, jsonFetch } from './http'
import type { CrmLiveConnector, CrmContactPage, CrmOrderPage, CrmToken } from './types'

const SCOPES = 'crm.objects.contacts.read crm.objects.deals.read oauth'

function requireConfig() {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
  const redirectUri =
    process.env.HUBSPOT_REDIRECT_URI ??
    `${process.env.TRACKING_BASE_URL ?? 'http://localhost:3001'}/integrations/HUBSPOT/oauth/callback`
  if (!clientId || !clientSecret) throw { statusCode: 503, message: 'HubSpot is not configured' }
  return { clientId, clientSecret, redirectUri }
}

function props(row: Record<string, unknown>) {
  return (row.properties as Record<string, string | null | undefined> | undefined) ?? {}
}

export const hubspotConnector: CrmLiveConnector = {
  provider: 'HUBSPOT',
  capabilities: catalogEntry('HUBSPOT')!.capabilities,
  oauth: true,
  configured: () => Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET),
  authUrl(state) {
    const { clientId, redirectUri } = requireConfig()
    const url = new URL('https://app.hubspot.com/oauth/authorize')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('state', state)
    return url.toString()
  },
  async exchangeCode(code) {
    const { clientId, clientSecret, redirectUri } = requireConfig()
    const token = await jsonFetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
      errorLabel: 'HubSpot token',
    })
    const accessToken = String(token.access_token ?? '')
    const info = await jsonFetch(`https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`, {
      errorLabel: 'HubSpot token info',
    })
    const expiresIn = Number(token.expires_in ?? 0)
    return {
      accessToken,
      refreshToken: token.refresh_token ? String(token.refresh_token) : undefined,
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
      externalAccountId: String(info.hub_id ?? info.hubId ?? ''),
    } satisfies CrmToken
  },
  async listContacts(token, cursor) {
    const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts')
    url.searchParams.set('limit', '100')
    url.searchParams.set('properties', 'email,firstname,lastname,phone,company')
    if (cursor) url.searchParams.set('after', cursor)
    const json = await jsonFetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      errorLabel: 'HubSpot contacts',
    })
    const results = (json.results as Record<string, unknown>[] | undefined) ?? []
    const paging = json.paging as { next?: { after?: string } } | undefined
    const contacts: CrmContactPage['contacts'] = results.map((row) => {
      const p = props(row)
      const name = [p.firstname, p.lastname].filter(Boolean).join(' ').trim() || 'Unknown'
      return {
        externalId: String(row.id ?? ''),
        name,
        email: p.email ?? null,
        phone: p.phone ?? null,
        company: p.company ?? null,
        raw: row,
      }
    })
    return { contacts, cursor: paging?.next?.after ?? null }
  },
  async listOrders(token, cursor): Promise<CrmOrderPage> {
    const url = new URL('https://api.hubapi.com/crm/v3/objects/deals')
    url.searchParams.set('limit', '100')
    url.searchParams.set('properties', 'dealname,amount,closedate,hs_is_closed_won')
    url.searchParams.set('associations', 'contacts')
    if (cursor) url.searchParams.set('after', cursor)
    const json = await jsonFetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      errorLabel: 'HubSpot deals',
    })
    const results = (json.results as Record<string, unknown>[] | undefined) ?? []
    const paging = json.paging as { next?: { after?: string } } | undefined
    const orders: CrmOrderPage['orders'] = []
    for (const row of results) {
      const p = props(row)
      if (p.hs_is_closed_won !== 'true') continue
      const amount = Number(p.amount ?? 0)
      if (!Number.isFinite(amount) || amount <= 0) continue
      const assoc = row.associations as { contacts?: { results?: { id: string }[] } } | undefined
      const contactId = assoc?.contacts?.results?.[0]?.id
      orders.push({
        externalEventId: `deal:${row.id}`,
        amount,
        occurredAt: p.closedate ?? undefined,
        productOrService: p.dealname ?? undefined,
        contact: { externalId: contactId },
        raw: row,
      })
    }
    return { orders, cursor: paging?.next?.after ?? null }
  },
}
