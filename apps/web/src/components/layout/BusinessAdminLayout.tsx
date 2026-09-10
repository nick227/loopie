import { Outlet, NavLink } from 'react-router-dom'
import { Building2, Users, CreditCard, ShieldCheck, ScrollText, Gift } from 'lucide-react'
import { BusinessHeader } from '@/components/business/BusinessHeader'
import { cn } from '@/lib/utils'

// The legacy business-owned affiliate routes remain available, but Settings links
// to the platform referral program.
const NAV_ITEMS = [
  { to: '/profile', label: 'Profile', icon: Building2 },
  { to: '/permissions', label: 'Permissions', icon: ShieldCheck },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/affiliate-program', label: 'Affiliate', icon: Gift },
  { to: '/audit', label: 'Audit', icon: ScrollText },
]

export function BusinessAdminLayout() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 px-3 sm:px-4">
      <BusinessHeader />
      <nav
        aria-label="Business settings"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )
            }
          >
            <item.icon size={16} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
