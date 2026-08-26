import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TABS = [
  { suffix: '', label: 'Overview', end: true },
  { suffix: '/budget', label: 'Budget', end: true },
  { suffix: '/creatives', label: 'Creatives', end: false },
  { suffix: '/ad-units', label: 'Ad Units', end: false },
  { suffix: '/leads', label: 'Leads', end: true },
] as const

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
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">{name}</h1>
        {actions}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/campaigns/${campaignId}${tab.suffix}`}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'shrink-0 px-3 py-2 text-sm',
                isActive
                  ? 'border-b-2 border-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
