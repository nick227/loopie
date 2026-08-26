import { Link } from 'react-router-dom'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  INACTIVE: 'Inactive',
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

export function CampaignAdRow({
  ad,
  activating,
  onActivate,
}: {
  ad: CampaignAd
  activating: boolean
  onActivate: (adUnitId: string) => void
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pr-6 align-top">
        <Link to={`/ads/${ad.id}`} className="text-sm font-medium underline underline-offset-4">
          {ad.creativeName}
        </Link>
        {ad.formatLabel ? (
          <p className="text-xs text-muted-foreground mt-0.5">{ad.formatLabel}</p>
        ) : null}
        {ad.serveUrl ? (
          <p className="text-[11px] text-muted-foreground break-all mt-0.5">{ad.serveUrl}</p>
        ) : null}
      </td>
      <td className="py-3 pr-6 align-top text-sm">{ad.channels.join(', ') || '—'}</td>
      <td className="py-3 pr-6 align-top text-sm">{STATUS_LABEL[ad.status]}</td>
      <td className="py-3 pr-6 align-top text-sm tabular-nums text-right">
        {ad.impressions.toLocaleString()}
      </td>
      <td className="py-3 pr-6 align-top text-sm tabular-nums text-right">
        {ad.clicks.toLocaleString()}
      </td>
      <td className="py-3 align-top text-right">
        {ad.canActivate && ad.activateId ? (
          <ActivateButton
            adUnitId={ad.activateId}
            activating={activating}
            onActivate={onActivate}
          />
        ) : null}
      </td>
    </tr>
  )
}
