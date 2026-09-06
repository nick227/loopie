import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, DollarSign, Wallet, FileText, Network } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/platform-affiliates', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/platform-affiliates/clients', label: 'Clients', icon: Users },
  { to: '/platform-affiliates/earnings', label: 'Earnings', icon: DollarSign },
  { to: '/platform-affiliates/payouts', label: 'Payouts', icon: Wallet },
  { to: '/platform-affiliates/terms', label: 'My Terms', icon: FileText },
  { to: '/platform-affiliates/managers', label: 'My Affiliates', icon: Network }, // Conditionally shown later
]

export function PlatformAffiliateLayout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Affiliate Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your LOOPIE referrals and commission earnings.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-12">
        <aside className="mb-8 w-full shrink-0 lg:mb-0 lg:w-56">
          <nav className="flex space-x-2 overflow-x-auto lg:flex-col lg:space-x-0 lg:space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )
                }
              >
                <item.icon size={18} className="shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
