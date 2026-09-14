import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useCreateIntegration,
  useCrmCatalog,
  useDisconnectIntegration,
  useDisconnectPlatformConnection,
  useIntegrations,
  usePlatformConnection,
  usePreviewIntegration,
  useStartCrmOAuth,
  useStartPlatformOAuth,
  useSyncIntegration,
} from '@project/sdk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { useFlatPages } from '@/hooks/useFlatPages'
import { apiErrorMessage } from '@/lib/apiError'

// One canonical "Connections" surface replacing the old /permissions (revoke-only audit list)
// and /integrations (CRM-only management) pages — see the 2026-09-14 design discussion. The
// backend keeps using separate models (Integration for CRM, PlatformConnection for ad
// platforms); this page is deliberately the one place a business owner goes to answer
// "what does LOOPIE have access to, what's it doing, and how do I manage it," grouped by
// purpose (Customer & data / Advertising) instead of by which backend model answers a card.

const CRM_LABELS: Record<string, string> = {
  HUBSPOT: 'HubSpot',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce',
  WEBHOOK: 'Webhook',
  GOOGLE_SHEETS: 'Google Sheets',
}

const CRM_PURPOSE: Record<string, string> = {
  HUBSPOT: 'Sync contacts and deals from your HubSpot CRM.',
  SHOPIFY: 'Import customers and orders from your Shopify store.',
  WOOCOMMERCE: 'Import customers and orders from your WooCommerce store using a read-only API key.',
  WEBHOOK: 'Receive contacts and orders pushed from your own systems.',
  GOOGLE_SHEETS: 'Use spreadsheets as LOOPIE data sources and schedule-sync destinations.',
  SALESFORCE: 'Sync contacts and deals from Salesforce.',
  SQUARE: 'Import customers and orders from Square.',
  PIPEDRIVE: 'Sync contacts and deals from Pipedrive.',
}

const PLATFORMS = [
  { id: 'META', label: 'Meta' },
  { id: 'GOOGLE', label: 'Google Ads' },
  { id: 'TIKTOK', label: 'TikTok' },
] as const

const PLATFORM_PURPOSE: Record<string, string> = {
  META: 'Run and manage ads on Facebook and Instagram.',
  GOOGLE: 'Run and manage Google Ads campaigns.',
  TIKTOK: 'Run and manage TikTok ad campaigns.',
}

function StatusLine({ status, lastSyncAt }: { status: string; lastSyncAt?: string | null }) {
  const label =
    status === 'CONNECTED'
      ? 'Connected'
      : status === 'PAUSED'
        ? 'Paused'
        : status === 'INCOMPLETE'
          ? 'Setup incomplete'
          : status === 'NEEDS_REAUTH'
            ? 'Reconnect required'
            : status === 'DISCONNECTED'
              ? 'Not connected'
              : 'Not connected'
  return (
    <p className="text-sm font-medium">
      {label}
      {status === 'CONNECTED' && lastSyncAt
        ? ` · last synced ${new Date(lastSyncAt).toLocaleString()}`
        : ''}
    </p>
  )
}

function CrmActivityLine({ row }: { row: any }) {
  if (row.provider === 'GOOGLE_SHEETS') {
    return (
      <p className="text-sm text-muted-foreground">
        {row.importSourceCount
          ? `${row.importSourceCount} spreadsheet${row.importSourceCount === 1 ? '' : 's'} connected`
          : 'No spreadsheets connected yet'}
      </p>
    )
  }
  if (row.provider === 'WEBHOOK') {
    return row.webhookUrl ? (
      <p className="break-all text-xs text-muted-foreground">{row.webhookUrl}</p>
    ) : null
  }
  if (row.lastSyncCreated != null || row.lastSyncLinked != null) {
    return (
      <p className="text-sm text-muted-foreground">
        {row.lastSyncCreated ?? 0} contact{row.lastSyncCreated === 1 ? '' : 's'} imported
        {row.lastSyncLinked ? `, ${row.lastSyncLinked} linked` : ''}
        {(row.lastSyncAmbiguous ?? 0) > 0 ? `, ${row.lastSyncAmbiguous} to review` : ''}
      </p>
    )
  }
  return null
}

function CrmConnectionCard({
  provider,
  label,
  availability,
  oauth,
  configured,
  row,
}: {
  provider: string
  label: string
  availability: string
  oauth: boolean
  configured: boolean
  row: any
}) {
  const create = useCreateIntegration()
  const oauthStart = useStartCrmOAuth()
  const sync = useSyncIntegration()
  const preview = usePreviewIntegration()
  const disconnect = useDisconnectIntegration()
  const [shop, setShop] = useState('')
  const [wooStoreUrl, setWooStoreUrl] = useState('')
  const [wooConsumerKey, setWooConsumerKey] = useState('')
  const [wooConsumerSecret, setWooConsumerSecret] = useState('')
  const [previewIntegrationId, setPreviewIntegrationId] = useState<string | null>(null)
  const [webhookCredentials, setWebhookCredentials] = useState<{
    url: string
    secret: string
  } | null>(null)

  async function connect(shopOverride?: string) {
    if (oauth) {
      const started = await oauthStart.mutateAsync({
        provider: provider as
          | 'HUBSPOT'
          | 'SALESFORCE'
          | 'PIPEDRIVE'
          | 'SHOPIFY'
          | 'WOOCOMMERCE'
          | 'SQUARE'
          | 'GOOGLE_SHEETS',
        shop: provider === 'SHOPIFY' ? (shopOverride ?? shop) : undefined,
      })
      if (!started.data) throw new Error('Missing OAuth URL')
      window.location.assign(started.data.url)
      return
    }
    if (provider === 'WEBHOOK') {
      const created = await create.mutateAsync({ provider: 'WEBHOOK' })
      if (created.data?.webhookUrl && created.data.webhookSecret) {
        setWebhookCredentials({ url: created.data.webhookUrl, secret: created.data.webhookSecret })
      }
      return
    }
    if (provider !== 'WOOCOMMERCE') throw new Error('This integration is not available yet')
    const created = await create.mutateAsync({
      provider: 'WOOCOMMERCE',
      storeUrl: wooStoreUrl,
      consumerKey: wooConsumerKey,
      consumerSecret: wooConsumerSecret,
    })
    if (created.data) {
      setPreviewIntegrationId(created.data.id)
      await preview.mutateAsync(created.data.id)
    }
  }

  async function onDisconnect() {
    if (!confirm(`Disconnect ${label}? You can reconnect at any time.`)) return
    try {
      await disconnect.mutateAsync(row.id)
      toast.success(`${label} disconnected`)
    } catch (error) {
      toast.error(apiErrorMessage(error, `Could not disconnect ${label}.`))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <StatusLine status={row?.status ?? 'DISCONNECTED'} lastSyncAt={row?.lastSyncAt} />
        <p className="text-muted-foreground">
          {CRM_PURPOSE[provider] ?? 'Connect this data source to LOOPIE.'}
        </p>
        {row ? <CrmActivityLine row={row} /> : null}
        {row?.lastSyncError ? (
          <p className="text-destructive">Last sync failed: {row.lastSyncError}</p>
        ) : null}
        {provider === 'WEBHOOK' && webhookCredentials ? (
          <div className="space-y-1 rounded-lg border border-warning/40 p-3 text-xs">
            <p>Copy this secret now; it will not be shown again.</p>
            <p className="break-all font-mono">{webhookCredentials.secret}</p>
          </div>
        ) : null}
        {provider === 'SHOPIFY' && !row ? (
          <Input
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="your-store.myshopify.com"
            aria-label="Shopify shop domain"
          />
        ) : null}
        {provider === 'WOOCOMMERCE' && (!row || row.status !== 'CONNECTED') ? (
          <div className="space-y-2">
            <Input
              value={wooStoreUrl}
              onChange={(event) => setWooStoreUrl(event.target.value)}
              placeholder="https://yourstore.com"
              aria-label="WooCommerce store URL"
            />
            <Input
              value={wooConsumerKey}
              onChange={(event) => setWooConsumerKey(event.target.value)}
              placeholder="Read-only consumer key (ck_…)"
              aria-label="WooCommerce consumer key"
            />
            <Input
              type="password"
              value={wooConsumerSecret}
              onChange={(event) => setWooConsumerSecret(event.target.value)}
              placeholder="Consumer secret (cs_…)"
              aria-label="WooCommerce consumer secret"
            />
          </div>
        ) : null}
        {provider === 'WOOCOMMERCE' && preview.data?.data && previewIntegrationId ? (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <p>
              {preview.data.data.newContacts} new · {preview.data.data.matchedContacts} matched ·{' '}
              {preview.data.data.duplicates} duplicates
            </p>
            <p>
              {preview.data.data.orders} orders · ${preview.data.data.revenue.toFixed(2)} revenue
            </p>
            {preview.data.data.truncated ? (
              <p className="text-warning">
                Preview capped at the first batch. Import it now, then use Continue sync until the
                store is current.
              </p>
            ) : null}
            <Button
              type="button"
              disabled={sync.isPending}
              onClick={() => sync.mutate(previewIntegrationId)}
            >
              {sync.isPending
                ? 'Importing…'
                : preview.data.data.truncated
                  ? 'Import first batch'
                  : 'Import contacts and orders'}
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {row?.status === 'CONNECTED' && provider === 'GOOGLE_SHEETS' ? (
            <>
              <Link to={`/integrations/${row.id}/google-sheets`}>
                <Button type="button" variant="outline">
                  Manage spreadsheets
                </Button>
              </Link>
              <Button type="button" variant="outline" onClick={onDisconnect}>
                Disconnect
              </Button>
            </>
          ) : row?.status === 'CONNECTED' && provider === 'WEBHOOK' ? (
            // Push-based, not pull — there's nothing to "sync now", but the secret is still a
            // real credential a business may want to revoke.
            <Button type="button" variant="outline" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : row?.status === 'CONNECTED' ? (
            <>
              <Button type="button" disabled={sync.isPending} onClick={() => sync.mutate(row.id)}>
                {row.syncHasMore ? 'Continue sync' : 'Sync now'}
              </Button>
              <Button type="button" variant="outline" onClick={onDisconnect}>
                Disconnect
              </Button>
            </>
          ) : row && row.status !== 'CONNECTED' && oauth && configured ? (
            // A row stuck at INCOMPLETE/NEEDS_REAUTH/PAUSED reuses the same row (never
            // re-enters as a duplicate) — CrmOAuthService.start() looks it up by
            // businessId+provider(+shop). Pass the row's own known shop domain for SHOPIFY;
            // the create-flow Input above is never rendered once a row exists, so it would
            // otherwise always be empty here. Label distinguishes "never finished the OAuth
            // screen" from "was connected, now needs reauthorizing/was disconnected" — same
            // action, different real history, worth naming accurately.
            <Button
              type="button"
              disabled={oauthStart.isPending}
              onClick={() => connect(row.externalAccountId ?? undefined)}
            >
              {row.status === 'INCOMPLETE' ? 'Finish connecting' : 'Reconnect'}
            </Button>
          ) : row &&
            row.status !== 'CONNECTED' &&
            (provider === 'WOOCOMMERCE' || provider === 'WEBHOOK') ? (
            // Non-OAuth providers have no token to silently resume. WooCommerce re-enters
            // credentials through the exact same create() call a first-time connect uses —
            // its upsert (keyed by store URL) revives this row rather than duplicating it,
            // confirmed safe. Webhook mints a genuinely new endpoint+secret by design (a
            // revoked secret should never become silently reusable) — the old row stays PAUSED
            // and drops out of this one-card-per-provider view, a known minor limitation, same
            // shape as a business running more than one Shopify store.
            <Button
              type="button"
              disabled={
                create.isPending ||
                (provider === 'WOOCOMMERCE' &&
                  (!wooStoreUrl || !wooConsumerKey || !wooConsumerSecret))
              }
              onClick={() => connect()}
            >
              {provider === 'WEBHOOK' ? 'Create new webhook' : 'Reconnect'}
            </Button>
          ) : row ? null : availability !== 'LIVE' ? (
            <Button type="button" disabled>
              Coming soon
            </Button>
          ) : oauth && !configured ? (
            <Button type="button" disabled>
              Unavailable
            </Button>
          ) : (
            <Button
              type="button"
              disabled={
                create.isPending ||
                oauthStart.isPending ||
                (provider === 'SHOPIFY' && oauth && configured && !shop) ||
                (provider === 'WOOCOMMERCE' &&
                  (!wooStoreUrl || !wooConsumerKey || !wooConsumerSecret))
              }
              onClick={() => connect()}
            >
              {provider === 'WEBHOOK' ? 'Create webhook' : 'Connect'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PlatformConnectionCard({ platform, label }: { platform: string; label: string }) {
  const query = usePlatformConnection(platform)
  const connect = useStartPlatformOAuth(platform)
  const disconnect = useDisconnectPlatformConnection()
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleConnect() {
    setActionError(null)
    try {
      const result = await connect.mutateAsync('/connections')
      if (!result.data?.url) throw new Error('Missing authorization URL')
      window.location.assign(result.data.url)
    } catch {
      setActionError(`${label} could not be connected. Try again later.`)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${label}? You can reconnect at any time.`)) return
    try {
      await disconnect.mutateAsync(platform)
      toast.success(`${label} disconnected`)
    } catch (error) {
      toast.error(apiErrorMessage(error, `Could not disconnect ${label}.`))
    }
  }

  if (query.isLoading) return <Skeleton className="h-44 w-full" />

  const connection = query.data?.data
  const unavailable = query.isError || !connection || !connection.configured
  const connected = connection?.status === 'CONNECTED'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {query.isError ? (
          <p className="text-destructive">Connection status could not be loaded.</p>
        ) : unavailable ? (
          <p className="text-muted-foreground">Not configured for this environment.</p>
        ) : (
          <StatusLine status={connection.status} />
        )}
        <p className="text-muted-foreground">{PLATFORM_PURPOSE[platform]}</p>
        {connection?.adAccountId ? (
          <p className="text-sm text-muted-foreground">Ad account {connection.adAccountId}</p>
        ) : null}
        {actionError ? <p className="text-destructive">{actionError}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {unavailable ? (
            <Button type="button" disabled>
              Unavailable
            </Button>
          ) : connected ? (
            <>
              <Link to="/ads">
                <Button type="button" variant="outline">
                  Manage
                </Button>
              </Link>
              <Button type="button" variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button type="button" loading={connect.isPending} onClick={handleConnect}>
              {connection?.status === 'NEEDS_REAUTH' ? 'Reconnect' : 'Connect'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AccessPermissionsSection() {
  const integrations = useIntegrations()
  const meta = usePlatformConnection('META')
  const google = usePlatformConnection('GOOGLE')
  const tiktok = usePlatformConnection('TIKTOK')
  const rows = useFlatPages(integrations).filter((row) => row.status !== 'PAUSED')
  const platformRows = [
    { label: 'Meta', data: meta.data?.data },
    { label: 'Google Ads', data: google.data?.data },
    { label: 'TikTok', data: tiktok.data?.data },
  ].filter((p) => p.data && p.data.status !== 'DISCONNECTED')

  if (rows.length === 0 && platformRows.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Access &amp; permissions</h2>
      <div className="divide-y divide-border rounded-lg border border-border text-sm">
        {rows.map((row) => {
          const access = [
            row.capabilities?.contacts ? 'Read contacts' : null,
            row.capabilities?.companies ? 'Read companies' : null,
            row.capabilities?.deals ? 'Read deals' : null,
            row.capabilities?.orders ? 'Read orders' : null,
            row.capabilities?.payments ? 'Read payments' : null,
            row.capabilities?.events ? 'Read customer events' : null,
          ].filter(Boolean)
          return (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="font-medium">{row.label ?? row.provider}</span>
              <span className="text-muted-foreground">
                {access.join(' · ') || 'Basic account access'}
              </span>
            </div>
          )
        })}
        {platformRows.map((p) => {
          const access = ['Publish and manage advertisements']
          if (p.data?.capabilities.pullSpend) access.push('Read advertising spend')
          if (p.data?.capabilities.mappingFields.includes('page'))
            access.push('Access selected pages')
          return (
            <div key={p.label} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="font-medium">{p.label}</span>
              <span className="text-muted-foreground">{access.join(' · ')}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ConnectionsPage() {
  const catalog = useCrmCatalog()
  const list = useIntegrations()
  const connected = useFlatPages(list)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    const justConnected = params.get('connected')
    if (!justConnected) return
    const label = CRM_LABELS[justConnected] ?? justConnected
    toast.success(`${label} connected.`)
    const next = new URLSearchParams(params)
    next.delete('connected')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        variant="list"
        title="Connections"
        description="Connect LOOPIE to the services your business already uses."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Customer &amp; data</h2>
        {catalog.isLoading || list.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(catalog.data?.data ?? []).map((provider) => {
              const row =
                provider.availability === 'LIVE'
                  ? connected.find((c) => c.provider === provider.provider)
                  : undefined
              return (
                <CrmConnectionCard
                  key={provider.provider}
                  provider={provider.provider}
                  label={provider.label}
                  availability={provider.availability}
                  oauth={provider.oauth}
                  configured={provider.configured}
                  row={row}
                />
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Advertising</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <PlatformConnectionCard
              key={platform.id}
              platform={platform.id}
              label={platform.label}
            />
          ))}
        </div>
      </section>

      <AccessPermissionsSection />
    </div>
  )
}
