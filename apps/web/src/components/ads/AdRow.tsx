import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'

type Creative = components['schemas']['Creative']

export function AdRow({ ad }: { ad: Creative }) {
  return (
    <Link
      to={`/ads/${ad.id}`}
      className="flex items-center gap-3 py-3 border-b border-border last:border-b-0"
    >
      {ad.previewUrl ? (
        <img src={ad.previewUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
      ) : (
        <div className="h-12 w-12 rounded bg-muted shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{ad.name}</p>
        <p className="text-xs text-muted-foreground">
          {ad.campaignCount} {ad.campaignCount === 1 ? 'campaign' : 'campaigns'}
        </p>
      </div>
      <div className="text-right text-xs tabular-nums text-muted-foreground shrink-0">
        <p>{ad.impressions.toLocaleString()} views</p>
        <p>{ad.clicks.toLocaleString()} clicks</p>
      </div>
    </Link>
  )
}
