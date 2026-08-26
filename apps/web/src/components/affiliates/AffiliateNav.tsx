import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/affiliates', label: 'Directory', end: true },
  { to: '/affiliates/classes', label: 'Classes & Deals', end: false },
  { to: '/affiliates/payouts', label: 'Payouts', end: true },
] as const

export function AffiliateNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border mb-4">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'shrink-0 px-3 py-2 text-sm',
              isActive ? 'border-b-2 border-primary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
