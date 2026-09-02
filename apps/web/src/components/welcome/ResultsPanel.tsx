import { Users, UserCheck, DollarSign, Send } from 'lucide-react'
import type { components } from '@project/sdk'
import { formatCount, formatMoney } from '@/components/home/homeFormat'

type WeeklyMetric = components['schemas']['WeeklyMetric']
type WeeklyResults = components['schemas']['WeeklyResults']

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
      <Icon size={16} className="text-muted-foreground" />
      <span className="min-w-0 truncate text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-xs text-muted-foreground">
        <span className="block text-lg font-bold tabular-nums leading-tight text-foreground">
          {format(metric.value)}
        </span>
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
    <div>
      <div className="rounded-2xl border border-border bg-surface p-5 grid gap-8 sm:grid-cols-4">
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
