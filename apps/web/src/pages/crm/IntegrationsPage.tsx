import { useCrmCatalog, useCreateIntegration, useIntegrations } from '@project/sdk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFlatPages } from '@/hooks/useFlatPages'
import { CrmNav } from './CrmNav'

export function IntegrationsPage() {
  const catalog = useCrmCatalog()
  const list = useIntegrations()
  const create = useCreateIntegration()
  const connected = useFlatPages(list)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect customer systems. Sync is inbound and non-destructive.
        </p>
      </div>
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
                    {provider.capabilities.orders ? ' · orders' : ''}
                    {provider.capabilities.contacts ? ' · contacts' : ''}
                  </p>
                  {row ? null : (
                    <Button
                      type="button"
                      disabled={create.isPending}
                      onClick={() => create.mutate({ provider: provider.provider })}
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
