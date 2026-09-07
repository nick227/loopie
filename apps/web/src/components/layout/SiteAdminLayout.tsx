import { Outlet, NavLink } from 'react-router-dom'
import { Building2, Users, Megaphone, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin/inbox', label: 'Site inbox', icon: Inbox },
  { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/platform-affiliates', label: 'Affiliates', icon: Users },
  { to: '/admin/house-ads', label: 'House Ads', icon: Megaphone },
  { to: '/admin/audit', label: 'Audit Log', icon: Building2 },
]

export function SiteAdminLayout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Global platform visibility and support operations.
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
