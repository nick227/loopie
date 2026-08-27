import { NavLink } from 'react-router-dom'
import { useCrmCatalog } from '@project/sdk'
import { cn } from '@/lib/utils'

const items = [
  { to: '/contacts', label: 'People', end: true },
  { to: '/contacts/import/new', label: 'Import' },
  { to: '/integrations', label: 'Integrations' },
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
