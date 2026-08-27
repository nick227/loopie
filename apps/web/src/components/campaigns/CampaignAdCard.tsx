import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Eye, MousePointerClick } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  INACTIVE: 'Inactive',
}

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-secondary text-secondary-foreground',
  ACTIVE: 'bg-primary text-primary-foreground',
  PAUSED: 'border border-border',
  INACTIVE: 'bg-secondary text-secondary-foreground',
}

export type CampaignAdStatus = 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'INACTIVE'

export type CampaignAd = {
  id: string
  creativeName: string
  channels: string[]
  status: CampaignAdStatus
  impressions: number
  clicks: number
  formatLabel?: string
  serveUrl?: string
  canActivate: boolean
  activateId?: string
  draftPushes?: {
    deploymentId: string
    platform: string
    externalAdId: string | null
    externalCampaignId: string | null
    externalAdSetId: string | null
  }[]
}

function ActivateButton({
  adUnitId,
  activating,
  onActivate,
}: {
  adUnitId: string
  activating: boolean
  onActivate: (adUnitId: string) => void
}) {
  return (
    <button
      type="button"
      disabled={activating}
      onClick={() => onActivate(adUnitId)}
      className="text-xs font-medium underline underline-offset-4 disabled:opacity-50"
    >
      Activate
    </button>
  )
}

export function CampaignAdCard({
  ad,
  activating,
  onActivate,
  pushReady,
  pushingId,
  onPush,
}: {
  ad: CampaignAd
  activating: boolean
  onActivate: (adUnitId: string) => void
  pushReady?: Record<string, boolean>
  pushingId?: string | null
  onPush?: (deploymentId: string) => void
}) {
  return (
    <Card className="overflow-hidden border-border bg-card/50">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-1 flex-col justify-center p-6 sm:border-r border-border">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  to={`/ads/${ad.id}`}
                  className="text-lg font-medium hover:underline underline-offset-4 flex items-center gap-2"
                >
                  {ad.creativeName}
                </Link>
                {ad.formatLabel ? (
                  <p className="text-sm text-muted-foreground mt-1">{ad.formatLabel}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[ad.status] ?? 'bg-secondary text-secondary-foreground'}`}
                  >
                    {STATUS_LABEL[ad.status] || ad.status}
                  </span>
                  {ad.channels.map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-normal"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                {ad.canActivate && ad.activateId ? (
                  <ActivateButton
                    adUnitId={ad.activateId}
                    activating={activating}
                    onActivate={onActivate}
                  />
                ) : null}
              </div>
            </div>

            {ad.serveUrl ? (
              <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
                  Embed URL
                </p>
                <p className="text-xs text-foreground font-mono break-all select-all">
                  {ad.serveUrl}
                </p>
              </div>
            ) : null}

            {(ad.draftPushes ?? []).map((row) => {
              if (!pushReady?.[row.platform] || !onPush) return null
              if (row.externalAdId) {
                return (
                  <p
                    key={row.deploymentId}
                    className="mt-3 text-xs text-muted-foreground font-mono break-all"
                  >
                    {row.platform} {row.externalCampaignId} / {row.externalAdSetId} /{' '}
                    {row.externalAdId}
                  </p>
                )
              }
              return (
                <button
                  key={row.deploymentId}
                  type="button"
                  disabled={pushingId === row.deploymentId}
                  onClick={() => onPush(row.deploymentId)}
                  className="mt-3 text-xs font-medium underline underline-offset-4 disabled:opacity-50"
                >
                  Push draft
                </button>
              )
            })}
          </div>

          <div className="flex sm:w-48 flex-row sm:flex-col divide-x sm:divide-x-0 sm:divide-y divide-border border-t sm:border-t-0 border-border bg-muted/20">
            <div className="flex-1 p-6 flex flex-col justify-center text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center justify-center gap-1.5 mb-2">
                <Eye className="w-3.5 h-3.5" />
                Views
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {ad.impressions.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 p-6 flex flex-col justify-center text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center justify-center gap-1.5 mb-2">
                <MousePointerClick className="w-3.5 h-3.5" />
                Clicks
              </p>
              <p className="text-2xl font-semibold tabular-nums">{ad.clicks.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
