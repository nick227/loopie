import { formatUsd } from '@/lib/money'

type LedgerCommission = {
  id: string
  amountMinor: number
  status: string
  sourceRef?: string | null
  createdAt: string
}

type LedgerPayout = {
  id: string
  amountMinor: number
  status: string
  createdAt: string
}

const STATUS: Record<string, string> = {
  PENDING: 'Pending',
  PAYABLE: 'Payable',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  REVERSED: 'Reversed',
  FAILED: 'Failed',
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export function CommissionLedger({
  commissions,
  payouts,
}: {
  commissions: LedgerCommission[]
  payouts?: LedgerPayout[]
}) {
  if (commissions.length === 0 && !payouts?.length) {
    return <p className="text-sm text-muted-foreground">No frozen commissions yet.</p>
  }

  return (
    <div className="space-y-2">
      {commissions.slice(0, 20).map((row) => (
        <p key={row.id} className="text-sm flex justify-between gap-3">
          <span>
            {formatUsd(row.amountMinor)} · {STATUS[row.status] ?? row.status}
            {row.sourceRef ? ` · sale ${row.sourceRef.slice(0, 8)}` : ''}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{when(row.createdAt)}</span>
        </p>
      ))}
      {payouts && payouts.length > 0 && (
        <div className="pt-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Payouts</p>
          {payouts.slice(0, 10).map((row) => (
            <p key={row.id} className="text-sm flex justify-between gap-3">
              <span>{formatUsd(row.amountMinor)} · {STATUS[row.status] ?? row.status}</span>
              <span className="text-xs text-muted-foreground shrink-0">{when(row.createdAt)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
