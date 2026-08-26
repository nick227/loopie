import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Megaphone,
  Image,
  Mail,
  LogOut,
  Handshake,
  CreditCard,
  Clapperboard,
  type LucideIcon,
  Bell,
  Search,
  Command,
} from 'lucide-react'
import { useCurrentUser, useLogout } from '@project/sdk'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

const SHOP_NAV: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/messages', label: 'Messages', icon: Mail },
  { to: '/ads', label: 'Ads', icon: Image },
  { to: '/media', label: 'Media', icon: Clapperboard },
]

const ADMIN_NAV: NavItem[] = [
  ...SHOP_NAV,
  { to: '/affiliates', label: 'Affiliates', icon: Handshake },
  { to: '/billing', label: 'Billing', icon: CreditCard },
]

const AFFILIATE_NAV: NavItem[] = [
  { to: '/portal', label: 'Home', icon: Home, end: true },
  { to: '/portal/team', label: 'Team', icon: Handshake },
  { to: '/portal/payouts', label: 'Payouts', icon: Mail },
]

export function Shell() {
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const me = useCurrentUser()
  const role = me.data?.data?.role ?? 'USER'
  const navItems = role === 'ADMIN' ? ADMIN_NAV : role === 'AFFILIATE' ? AFFILIATE_NAV : SHOP_NAV

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col border-r border-border bg-surface/50 backdrop-blur-xl px-4 py-6 gap-6 z-40 transition-all duration-300">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Command size={18} />
          </div>
          <span className="font-semibold tracking-tight text-lg">Loopie</span>
        </div>

        <div className="flex-1 space-y-1.5 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/80',
                )
              }
            >
              <item.icon
                size={18}
                className="opacity-80 group-hover:opacity-100 transition-opacity"
              />
              {item.label}
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors group mt-auto"
        >
          <LogOut size={18} className="opacity-80 group-hover:opacity-100 transition-opacity" />
          Log out
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6 lg:px-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative hidden sm:block w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search..."
                className="h-9 w-full rounded-full border border-input-border bg-surface pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Bell size={18} />
            </button>
            <div className="h-8 w-8 rounded-full bg-accent border border-border flex items-center justify-center overflow-hidden cursor-pointer">
              <span className="text-xs font-semibold text-foreground">
                {me.data?.data?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 md:pb-8 pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md flex justify-around px-2 py-3 z-50 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={cn(isActive ? 'opacity-100' : 'opacity-70')} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
