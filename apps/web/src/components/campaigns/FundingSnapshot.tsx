import { MetricStrip } from '@/components/campaigns/MetricStrip'
import { formatUsd } from '@/lib/money'

type Funding = {
  planningBudget: number
  authorizedAmountMinor: number
  reservedAmountMinor: number
  platformReportedAmountMinor: number
  settledAmountMinor: number
  clientAvailableAmountMinor: number
}

export function FundingSnapshot({ funding }: { funding: Funding }) {
  return (
    <MetricStrip
      cells={[
        {
          label: 'Spend Plan',
          value: formatUsd(Math.round(funding.planningBudget * 100)),
          hint: 'Operational only',
        },
        { label: 'Spend Limit', value: formatUsd(funding.authorizedAmountMinor) },
        { label: 'Reported', value: formatUsd(funding.platformReportedAmountMinor) },
        { label: 'Settled', value: formatUsd(funding.settledAmountMinor) },
      ]}
    />
  )
}
