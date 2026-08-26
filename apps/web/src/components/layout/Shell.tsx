import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Megaphone, Mail, LogOut, type LucideIcon } from 'lucide-react'
import { useLogout } from '@project/sdk'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

// docs/00-unified-ia-navigation.md (2026-08-27 revision): Home · Campaigns · Messages.
// Contacts and Performance are deliberately not top-level — reached via
// Messages > Contacts and each surface's own Performance section instead.
const navItems: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/messages', label: 'Messages', icon: Mail },
]

export function Shell() {
  const logout = useLogout()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col border-r px-3 py-6 gap-1">
        <div className="flex-1 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>
      </aside>

      {/* Main content */}
      <main className="md:ml-56 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-xl mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex justify-around px-2 py-2 z-10">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-4 py-1 rounded text-xs',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
