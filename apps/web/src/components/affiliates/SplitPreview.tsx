import { computePreviewSplit, SAMPLE_SALE_DOLLARS } from '@/lib/affiliateSplit'
import { formatDollars, formatUsd } from '@/lib/money'

export function SplitPreview({
  rateBps,
  managerShareBps,
  hasManager,
}: {
  rateBps: number | null | undefined
  managerShareBps: number | null | undefined
  hasManager: boolean
}) {
  const split = computePreviewSplit({ rateBps, managerShareBps, hasManager })
  if (split.grossCommissionMinor <= 0) {
    return <p className="text-sm text-muted-foreground">No commission on a {formatDollars(SAMPLE_SALE_DOLLARS)} sale.</p>
  }

  return (
    <div className="space-y-1">
      <p className="text-sm">
        On a {formatDollars(SAMPLE_SALE_DOLLARS)} sale you keep {formatUsd(split.affiliateCommissionMinor)}
        {hasManager ? `; the manager keeps ${formatUsd(split.managerCommissionMinor)}` : ''}.
      </p>
      {hasManager && (
        <p className="text-xs text-muted-foreground">
          {formatUsd(split.affiliateCommissionMinor)} + {formatUsd(split.managerCommissionMinor)} = {formatUsd(split.grossCommissionMinor)} — manager cut is a split, not extra cost.
        </p>
      )}
      <p className="text-xs text-muted-foreground">A deal change applies to the next sale. Past commissions stay frozen.</p>
    </div>
  )
}
