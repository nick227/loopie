import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function CampaignNav({
  campaignId,
  name,
  actions,
}: {
  campaignId: string
  name: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <Link
        to={`/campaigns/${campaignId}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {name}
      </Link>
      {actions}
    </div>
  )
}
