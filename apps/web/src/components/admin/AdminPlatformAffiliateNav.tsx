import { Outlet, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/admin/platform-affiliates', label: 'Directory', end: true },
  { to: '/admin/platform-affiliates/classes', label: 'Classes & Deals', end: false },
  { to: '/admin/platform-affiliates/rates', label: 'Rates', end: false },
  { to: '/admin/platform-affiliates/commissions', label: 'Money Flow', end: false },
  { to: '/admin/platform-affiliates/payouts', label: 'Payouts', end: false },
  { to: '/admin/platform-affiliates/referrals', label: 'Referrals', end: false },
] as const

export function AdminPlatformAffiliateNav() {
  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
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
      <Outlet />
    </div>
  )
}
