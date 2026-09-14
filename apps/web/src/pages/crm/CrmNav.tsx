import { NavLink } from 'react-router-dom'
import { useCrmCatalog } from '@project/sdk'
import { cn } from '@/lib/utils'

// Integrations was replaced by the unified /connections page (2026-09-14) — CRM management is
// no longer a distinct destination from ad-platform connections. Connections stays listed here
// deliberately: the key UX test is that someone on Contacts thinking "I need to connect Shopify"
// has one obvious click to the right place, not a hunt through Settings.
//
// Audiences (2026-09-14): a real, already-built CRM concept (live saved queries over the
// customer graph, targeted by Messages) whose list page had no inbound link from anywhere — the
// detail page was reachable (linked from a message's audience name) but the list wasn't, an IA
// bug rather than an intentionally orphaned surface. Belongs alongside Contacts/Leads, not as its
// own top-level nav destination.
const items = [
  { to: '/contacts', label: 'Contacts', end: true },
  { to: '/leads', label: 'Leads', end: true },
  { to: '/audiences', label: 'Audiences', end: true },
  { to: '/connections', label: 'Connections', end: true },
]

export function CrmNav() {
  const catalog = useCrmCatalog()
  const matchCount = catalog.data?.unresolvedMatchCount ?? 0

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm',
              isActive
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
      {matchCount > 0 ? (
        <NavLink
          to="/contact-matches"
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm',
              isActive
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          Matches
          <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
            {matchCount}
          </span>
        </NavLink>
      ) : null}
    </nav>
  )
}
