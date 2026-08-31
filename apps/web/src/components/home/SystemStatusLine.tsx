import type { components } from '@project/sdk'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type SystemStatus = components['schemas']['HomeSystemStatus']

export function SystemStatusLine({ systems }: { systems: SystemStatus[] }) {
  return (
    <section aria-labelledby="system-status-title" className="border-y border-border py-4">
      <h2
        id="system-status-title"
        className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground"
      >
        System status
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-border">
        {systems.map((system) => (
          <li key={system.id} className="min-w-0 lg:px-4 lg:first:pl-0 lg:last:pr-0">
            <Link
              to={system.href}
              className="block rounded-sm outline-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    system.state === 'CURRENT'
                      ? 'bg-primary'
                      : system.state === 'QUIET'
                        ? 'bg-muted-foreground/40'
                        : system.state === 'DEGRADED' || system.state === 'DISCONNECTED'
                          ? 'bg-destructive'
                          : 'bg-warning',
                  )}
                  aria-hidden="true"
                />
                {system.label}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {system.detail}
              </span>
              <span className="sr-only">
                Status: {system.state.toLowerCase().replaceAll('_', ' ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
