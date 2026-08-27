import { useParams } from 'react-router-dom'
import {
  usePlatformAccounts,
  usePlatformConnection,
  usePlatformPages,
  useStartPlatformOAuth,
  useUpdatePlatformConnection,
} from '@project/sdk'
import { PLATFORM_LABEL } from '@/components/campaigns/buildCampaignAds'
import { Button } from '@/components/ui/Button'

const FIELD_LABEL: Record<string, string> = {
  adAccount: 'Ad account',
  page: 'Page',
  defaultCountry: 'Default country',
}

export function CampaignPlatformConnect({ platforms }: { platforms: string[] }) {
  const connectable = platforms.filter((platform) => platform !== 'LOOPIE')
  if (connectable.length === 0) return null
  return (
    <div className="space-y-3">
      {connectable.map((platform) => (
        <PlatformConnectRow key={platform} platform={platform} />
      ))}
    </div>
  )
}

function PlatformConnectRow({ platform }: { platform: string }) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const query = usePlatformConnection(platform)
  const start = useStartPlatformOAuth(platform)
  const update = useUpdatePlatformConnection(platform)
  const connection = query.data?.data
  const tokenPresent = Boolean(
    connection && connection.status !== 'DISCONNECTED' && connection.status !== 'NEEDS_REAUTH',
  )
  const accounts = usePlatformAccounts(platform, tokenPresent)
  const pages = usePlatformPages(
    platform,
    tokenPresent && Boolean(connection?.capabilities.mappingFields.includes('page')),
  )

  if (query.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        {PLATFORM_LABEL[platform] ?? platform}: connector not available yet.
      </p>
    )
  }
  if (!connection) return null
  if (!connection.capabilities.oauth) return null

  async function connect() {
    const result = await start.mutateAsync(`/campaigns/${campaignId}`)
    const url = result?.data?.url
    if (url) window.location.assign(url)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground min-w-[4.5rem]">
        {PLATFORM_LABEL[platform] ?? platform}
      </p>
      {connection.status === 'DISCONNECTED' || connection.status === 'NEEDS_REAUTH' ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={connect}
          disabled={start.isPending || !connection.configured}
        >
          {connection.configured ? 'Connect' : 'Not configured'}
        </Button>
      ) : (
        <>
          {connection.capabilities.mappingFields.includes('adAccount') ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {FIELD_LABEL.adAccount}
              </span>
              <select
                value={connection.adAccountId ?? ''}
                onChange={(e) => update.mutate({ adAccountId: e.target.value })}
                className="flex h-9 rounded-lg border border-input-border bg-transparent px-2 text-sm"
              >
                <option value="">Select</option>
                {(accounts.data?.data ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {connection.capabilities.mappingFields.includes('page') ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {FIELD_LABEL.page}
              </span>
              <select
                value={connection.pageId ?? ''}
                onChange={(e) => update.mutate({ pageId: e.target.value })}
                className="flex h-9 rounded-lg border border-input-border bg-transparent px-2 text-sm"
              >
                <option value="">Select</option>
                {(pages.data?.data ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {connection.status === 'CONNECTED' ? 'Connected' : 'Pick account and Page'}
          </span>
        </>
      )}
    </div>
  )
}
