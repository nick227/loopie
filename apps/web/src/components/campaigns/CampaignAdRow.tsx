const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
}

export type CampaignAd = {
  id: string
  platform: string
  creativeName: string
  status: string
  impressions: number
  clicks: number
  formatLabel?: string
  serveUrl?: string
  canActivate: boolean
}

export function CampaignAdRow({
  ad,
  activating,
  onActivate,
}: {
  ad: CampaignAd
  activating: boolean
  onActivate: (id: string) => void
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pr-6 align-top">
        <p className="text-sm font-medium">{ad.creativeName}</p>
        {ad.formatLabel ? (
          <p className="text-xs text-muted-foreground mt-0.5">{ad.formatLabel}</p>
        ) : null}
        {ad.serveUrl ? (
          <p className="text-[11px] text-muted-foreground break-all mt-0.5">{ad.serveUrl}</p>
        ) : null}
      </td>
      <td className="py-3 pr-6 align-top text-sm">{ad.platform}</td>
      <td className="py-3 pr-6 align-top text-sm">{STATUS_LABEL[ad.status] ?? ad.status}</td>
      <td className="py-3 pr-6 align-top text-sm tabular-nums text-right">
        {ad.impressions.toLocaleString()}
      </td>
      <td className="py-3 pr-6 align-top text-sm tabular-nums text-right">
        {ad.clicks.toLocaleString()}
      </td>
      <td className="py-3 align-top text-right">
        {ad.canActivate ? (
          <button
            type="button"
            disabled={activating}
            onClick={() => onActivate(ad.id)}
            className="text-xs font-medium underline underline-offset-4 disabled:opacity-50"
          >
            Activate
          </button>
        ) : null}
      </td>
    </tr>
  )
}
