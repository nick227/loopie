import { useState } from 'react'
import {
  useCreateIntegration,
  useCrmCatalog,
  useIntegrations,
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
  const connected = useFlatPages(list)
  const [shop, setShop] = useState('')

  async function connect(
    provider: 'HUBSPOT' | 'SALESFORCE' | 'SHOPIFY' | 'SQUARE' | 'PIPEDRIVE',
    oauthEnabled?: boolean,
  ) {
    if (oauthEnabled) {
      const started = await oauth.mutateAsync({
        provider,
        shop: provider === 'SHOPIFY' ? shop : undefined,
      })
      if (!started.data) throw new Error('Missing OAuth URL')
      window.location.assign(started.data.url)
      return
    }
    await create.mutateAsync({
      provider,
      externalAccountId: provider === 'SHOPIFY' ? shop || undefined : undefined,
    })
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
            const row = connected.find((c) => c.provider === provider.provider)
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
                  {provider.provider === 'SHOPIFY' && !row ? (
                    <Input
                      value={shop}
                      onChange={(event) => setShop(event.target.value)}
                      placeholder="your-store.myshopify.com"
                      aria-label="Shopify shop domain"
                    />
                  ) : null}
                  {row?.status === 'CONNECTED' ? (
                    <Button
                      type="button"
                      disabled={sync.isPending}
                      onClick={() => sync.mutate(row.id)}
                    >
                      Sync now
                    </Button>
                  ) : row ? null : (
                    <Button
                      type="button"
                      disabled={
                        create.isPending ||
                        oauth.isPending ||
                        (provider.provider === 'SHOPIFY' &&
                          Boolean(provider.oauth && provider.configured) &&
                          !shop)
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
