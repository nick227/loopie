import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const items = [
  { to: '/contacts', label: 'People', end: true },
  { to: '/contacts/import/new', label: 'Import' },
  { to: '/integrations', label: 'Integrations' },
  { to: '/contact-matches', label: 'Matches' },
]

export function CrmNav() {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
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
    </nav>
  )
}
