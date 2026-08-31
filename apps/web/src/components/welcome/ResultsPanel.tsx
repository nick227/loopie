import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  UserCheck,
  DollarSign,
  Send,
} from 'lucide-react'
import type { components } from '@project/sdk'
import { formatCount, formatMoney } from '@/components/home/homeFormat'
import { cn } from '@/lib/utils'

type WeeklyMetric = components['schemas']['WeeklyMetric']
type WeeklyResults = components['schemas']['WeeklyResults']

function DeltaCell({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return <span className="text-xs font-medium text-muted-foreground">New</span>
  }
  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus size={12} /> No change
      </span>
    )
  }
  const up = deltaPct > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        up ? 'text-success' : 'text-destructive',
      )}
    >
      <Icon size={13} />
      {Math.abs(deltaPct)}%
    </span>
  )
}

function ResultsRow({
  icon: Icon,
  label,
  metric,
  format,
}: {
  icon: typeof Users
  label: string
  metric: WeeklyMetric
  format: (value: number) => string
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 gap-y-0 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={16} />
      </span>
      <span className="min-w-0 truncate text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-xs text-muted-foreground">
        <span className="block text-lg font-bold tabular-nums leading-tight text-foreground">
          {format(metric.value)}
        </span>
        <span className="whitespace-nowrap">vs {format(metric.previousValue)} last week</span>
      </span>
      <span className="w-16 shrink-0 text-right">
        <DeltaCell deltaPct={metric.deltaPct} />
      </span>
    </div>
  )
}

// Expanded into a real table — every row shows this week's value *and* last week's raw number
// side by side, not just a percentage hiding the comparison behind it (real backend data:
// WeeklyMetric.previousValue, homeOverview.ts). "Maximize top-level metrics" — this is the
// numbers-first section of Home, so it leads with the most rows of any panel here.
export function ResultsPanel({ weeklyResults }: { weeklyResults: WeeklyResults }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Results</h2>
        <Link
          to="/results"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View full report
        </Link>
      </div>
      <div className="mt-1 divide-y divide-border">
        <ResultsRow
          icon={Users}
          label="Leads"
          metric={weeklyResults.leads}
          format={(v) => formatCount(v)}
        />
        <ResultsRow
          icon={UserCheck}
          label="Customers"
          metric={weeklyResults.customers}
          format={(v) => formatCount(v)}
        />
        <ResultsRow
          icon={DollarSign}
          label="Revenue"
          metric={weeklyResults.revenue}
          format={(v) => formatMoney(v, 'USD', true)}
        />
        <ResultsRow
          icon={Send}
          label="Messages sent"
          metric={weeklyResults.messagesSent}
          format={(v) => formatCount(v)}
        />
      </div>
    </div>
  )
}
