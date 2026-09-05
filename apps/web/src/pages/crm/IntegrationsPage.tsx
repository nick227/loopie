import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useCreateIntegration,
  useCrmCatalog,
  useIntegrations,
  usePreviewIntegration,
  useStartCrmOAuth,
  useSyncIntegration,
} from '@project/sdk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { useFlatPages } from '@/hooks/useFlatPages'
import { CrmNav } from './CrmNav'

export function IntegrationsPage() {
  const catalog = useCrmCatalog()
  const list = useIntegrations()
  const create = useCreateIntegration()
  const oauth = useStartCrmOAuth()
  const sync = useSyncIntegration()
  const preview = usePreviewIntegration()
  const connected = useFlatPages(list)
  const [shop, setShop] = useState('')
  const [wooStoreUrl, setWooStoreUrl] = useState('')
  const [wooConsumerKey, setWooConsumerKey] = useState('')
  const [wooConsumerSecret, setWooConsumerSecret] = useState('')
  const [previewIntegrationId, setPreviewIntegrationId] = useState<string | null>(null)
  const [webhookCredentials, setWebhookCredentials] = useState<{
    url: string
    secret: string
  } | null>(null)

  async function connect(
    provider:
      | 'HUBSPOT'
      | 'SALESFORCE'
      | 'SHOPIFY'
      | 'WOOCOMMERCE'
      | 'WEBHOOK'
      | 'SQUARE'
      | 'PIPEDRIVE'
      | 'GOOGLE_SHEETS',
    oauthEnabled?: boolean,
  ) {
    if (oauthEnabled) {
      const started = await oauth.mutateAsync({
        provider: provider as Exclude<typeof provider, 'WEBHOOK'>,
        shop: provider === 'SHOPIFY' ? shop : undefined,
      })
      if (!started.data) throw new Error('Missing OAuth URL')
      window.location.assign(started.data.url)
      return
    }
    if (provider === 'WEBHOOK') {
      const created = await create.mutateAsync({ provider: 'WEBHOOK' })
      if (created.data?.webhookUrl && created.data.webhookSecret) {
        setWebhookCredentials({
          url: created.data.webhookUrl,
          secret: created.data.webhookSecret,
        })
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
    if (provider === 'WOOCOMMERCE' && created.data) {
      setPreviewIntegrationId(created.data.id)
      await preview.mutateAsync(created.data.id)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        variant="list"
        title="Integrations"
        description="Inbound only. LOOPIE keeps name, email, phone, and consent when it already has them."
      />
      <CrmNav />
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
              <Card key={provider.provider}>
                <CardHeader>
                  <CardTitle className="text-base">{provider.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {row ? row.status : 'Not connected'}
                    {row?.lastSyncAt
                      ? ` · synced ${new Date(row.lastSyncAt).toLocaleString()}`
                      : ''}
                  </p>
                  {row && (row.lastSyncCreated != null || row.lastSyncLinked != null) ? (
                    <p className="text-muted-foreground">
                      Last pull: {row.lastSyncCreated ?? 0} new, {row.lastSyncLinked ?? 0} linked
                      {(row.lastSyncAmbiguous ?? 0) > 0
                        ? `, ${row.lastSyncAmbiguous} to review`
                        : ''}
                    </p>
                  ) : null}
                  {row?.lastSyncError ? (
                    <p className="text-destructive">Last sync failed: {row.lastSyncError}</p>
                  ) : null}
                  {provider.provider === 'WEBHOOK' && row?.webhookUrl ? (
                    <p className="break-all text-xs text-muted-foreground">{row.webhookUrl}</p>
                  ) : null}
                  {provider.provider === 'WEBHOOK' && webhookCredentials ? (
                    <div className="space-y-1 rounded-lg border border-warning/40 p-3 text-xs">
                      <p>Copy this secret now; it will not be shown again.</p>
                      <p className="break-all font-mono">{webhookCredentials.secret}</p>
                    </div>
                  ) : null}
                  {provider.provider === 'SHOPIFY' && !row ? (
                    <Input
                      value={shop}
                      onChange={(event) => setShop(event.target.value)}
                      placeholder="your-store.myshopify.com"
                      aria-label="Shopify shop domain"
                    />
                  ) : null}
                  {provider.provider === 'WOOCOMMERCE' && !row ? (
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
                  {provider.provider === 'WOOCOMMERCE' &&
                  preview.data?.data &&
                  previewIntegrationId ? (
                    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                      <p>
                        {preview.data.data.newContacts} new · {preview.data.data.matchedContacts}{' '}
                        matched · {preview.data.data.duplicates} duplicates
                      </p>
                      <p>
                        {preview.data.data.orders} orders · ${preview.data.data.revenue.toFixed(2)}{' '}
                        revenue
                      </p>
                      {preview.data.data.truncated ? (
                        <p className="text-warning">
                          Preview capped at the first batch. Import it now, then use Continue sync
                          until the store is current.
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
                  {row?.status === 'CONNECTED' && provider.provider === 'GOOGLE_SHEETS' ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        {row.spreadsheetName
                          ? `Spreadsheet: ${row.spreadsheetName}`
                          : 'No spreadsheet chosen yet'}
                      </p>
                      <Link to={`/integrations/${row.id}/google-sheets`}>
                        <Button type="button" variant="outline">
                          Manage spreadsheet
                        </Button>
                      </Link>
                    </div>
                  ) : row?.status === 'CONNECTED' && provider.provider !== 'WEBHOOK' ? (
                    <Button
                      type="button"
                      disabled={sync.isPending}
                      onClick={() => sync.mutate(row.id)}
                    >
                      {row.syncHasMore ? 'Continue sync' : 'Sync now'}
                    </Button>
                  ) : row ? null : provider.availability !== 'LIVE' ? (
                    <Button type="button" disabled>
                      Coming soon
                    </Button>
                  ) : provider.oauth && !provider.configured ? (
                    <Button type="button" disabled>
                      Unavailable
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={
                        create.isPending ||
                        oauth.isPending ||
                        (provider.provider === 'SHOPIFY' &&
                          Boolean(provider.oauth && provider.configured) &&
                          !shop) ||
                        (provider.provider === 'WOOCOMMERCE' &&
                          (!wooStoreUrl || !wooConsumerKey || !wooConsumerSecret))
                      }
                      onClick={() =>
                        connect(provider.provider, provider.oauth && provider.configured)
                      }
                    >
                      Connect
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
