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
  const cells = [
    { label: 'Planning budget', value: formatUsd(Math.round(funding.planningBudget * 100)), hint: 'Operational only' },
    { label: 'Authorized funds', value: formatUsd(funding.authorizedAmountMinor) },
    { label: 'Reserved funds', value: formatUsd(funding.reservedAmountMinor) },
    { label: 'Platform-reported spend', value: formatUsd(funding.platformReportedAmountMinor) },
    { label: 'Settled spend', value: formatUsd(funding.settledAmountMinor) },
    { label: 'Client available balance', value: formatUsd(funding.clientAvailableAmountMinor), hint: 'Wallet, not this campaign' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-lg border bg-surface p-3">
          <p className="text-xs text-muted-foreground">{cell.label}</p>
          <p className="text-sm font-medium tabular-nums">{cell.value}</p>
          {cell.hint ? <p className="text-[11px] text-muted-foreground">{cell.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
