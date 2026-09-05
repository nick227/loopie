import { Outlet, NavLink } from 'react-router-dom'
import { Building2, Users, CreditCard, Handshake, ShieldCheck, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/profile', label: 'Business profile', icon: Building2 },
  { to: '/permissions', label: 'Permissions', icon: ShieldCheck },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/billing', label: 'Billing & usage', icon: CreditCard },
  { to: '/affiliates', label: 'Affiliates', icon: Handshake },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
]

export function BusinessAdminLayout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your business profile, permissions, team, billing, and affiliate program.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-12">
        <aside className="mb-8 w-full shrink-0 lg:mb-0 lg:w-56">
          <nav className="flex space-x-2 overflow-x-auto lg:flex-col lg:space-x-0 lg:space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
