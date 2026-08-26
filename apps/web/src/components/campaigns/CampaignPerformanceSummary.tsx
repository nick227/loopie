import { MetricStrip } from '@/components/campaigns/MetricStrip'
import { formatDollars } from '@/lib/money'

type Performance = {
  spend?: number
  views?: number
  clicks?: number
  leads?: number
  sales?: number
  cpl?: number | null
}

function count(value: number | undefined) {
  return (value ?? 0).toLocaleString()
}

export function CampaignPerformanceSummary({
  performance,
}: {
  performance: Performance | undefined
}) {
  return (
    <MetricStrip
      cells={[
        { label: 'Views', value: count(performance?.views) },
        { label: 'Clicks', value: count(performance?.clicks) },
        { label: 'Leads', value: count(performance?.leads) },
        { label: 'Sales', value: count(performance?.sales) },
        { label: 'Spend', value: formatDollars(performance?.spend ?? 0) },
        { label: 'CPL', value: performance?.cpl == null ? '—' : formatDollars(performance.cpl) },
      ]}
    />
  )
}
