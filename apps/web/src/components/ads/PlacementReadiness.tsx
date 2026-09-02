import { Ban, CircleAlert, CircleCheck } from 'lucide-react'
import type { PlacementReadiness as PlacementReadinessRow } from '@/lib/placementCapabilities'
import { cn } from '@/lib/utils'

const ICON = {
  READY: CircleCheck,
  NEEDS_ATTENTION: CircleAlert,
  UNSUPPORTED: Ban,
} as const

const TEXT_CLASS = {
  READY: 'text-foreground',
  NEEDS_ATTENTION: 'text-amber-600 dark:text-amber-500',
  UNSUPPORTED: 'text-muted-foreground',
} as const

function Row({ row }: { row: PlacementReadinessRow }) {
  const Icon = ICON[row.state]
  return (
    <li className="flex items-start gap-2 py-1.5">
      <Icon size={15} className={cn('mt-0.5 shrink-0', TEXT_CLASS[row.state])} />
      <div className="min-w-0">
        <p className={cn('text-sm font-medium', TEXT_CLASS[row.state])}>{row.label}</p>
        {row.warnings.length > 0 ? (
          <p className="text-xs text-muted-foreground">{row.warnings[0]}</p>
        ) : null}
      </div>
    </li>
  )
}

export function PlacementReadiness({ rows }: { rows: PlacementReadinessRow[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Placement readiness
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border px-3">
        {rows.map((row) => (
          <Row key={row.platform} row={row} />
        ))}
      </ul>
    </div>
  )
}
