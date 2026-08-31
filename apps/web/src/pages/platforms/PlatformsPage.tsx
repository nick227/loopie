import { useState } from 'react'
import { usePlatformConnection, useStartPlatformOAuth } from '@project/sdk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'

const PLATFORMS = [
  { id: 'META', name: 'Meta' },
  { id: 'GOOGLE', name: 'Google' },
  { id: 'TIKTOK', name: 'TikTok' },
] as const

function PlatformCard({ platform, name }: { platform: string; name: string }) {
  const query = usePlatformConnection(platform)
  const connect = useStartPlatformOAuth(platform)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleConnect() {
    setActionError(null)
    try {
      const result = await connect.mutateAsync('/platforms')
      if (!result.data?.url) throw new Error('Missing authorization URL')
      window.location.assign(result.data.url)
    } catch {
      setActionError(`${name} could not be connected. Try again later.`)
    }
  }

  if (query.isLoading) return <Skeleton className="h-44 w-full" />

  const connection = query.data?.data
  const unavailable = query.isError || !connection || !connection.configured
  const connected = connection?.status === 'CONNECTED'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Connection status could not be loaded.
          </p>
        ) : unavailable ? (
          <p className="text-sm text-muted-foreground">
            This integration is not configured for this environment.
          </p>
        ) : (
          <div>
            <p className="text-sm font-medium">
              {connected
                ? 'Connected'
                : connection.status === 'INCOMPLETE'
                  ? 'Setup incomplete'
                  : connection.status === 'NEEDS_REAUTH'
                    ? 'Reconnect required'
                    : 'Not connected'}
            </p>
            {connection.adAccountId && (
              <p className="mt-1 text-xs text-muted-foreground">
                Ad account {connection.adAccountId}
              </p>
            )}
          </div>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        )}
        {unavailable ? (
          <Button disabled className="w-full">
            Unavailable
          </Button>
        ) : connected ? (
          <p className="text-xs text-muted-foreground">
            Manage account mapping from a campaign’s platform settings.
          </p>
        ) : (
          <Button onClick={handleConnect} loading={connect.isPending} className="w-full">
            {connection.status === 'NEEDS_REAUTH' ? 'Reconnect' : 'Connect'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function PlatformsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Advertising platforms"
        description="Connection status comes directly from your configured integrations."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map((platform) => (
          <PlatformCard key={platform.id} platform={platform.id} name={platform.name} />
        ))}
      </div>
    </div>
  )
}
