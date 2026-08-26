import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAffiliateEarnings, useMarkCommissionPayable, useCreatePayout } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { CommissionLedger } from '@/components/affiliates/CommissionLedger'
import { ConnectStatusBadge, payoutQueueLabel } from '@/components/affiliates/ConnectStatusBadge'
import { formatUsd, newIdempotencyKey } from '@/lib/money'

export function OwedRow({
  affiliateId,
  name,
  pendingMinor,
  payableMinor,
  openPayoutStatus,
  payoutsEnabled,
  connectStatus,
}: {
  affiliateId: string
  name: string
  pendingMinor: number
  payableMinor: number
  openPayoutStatus: string | null
  payoutsEnabled: boolean
  connectStatus: string
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const earnings = useAffiliateEarnings(affiliateId)
  const mark = useMarkCommissionPayable()
  const pay = useCreatePayout()
  const data = earnings.data?.data
  const inFlightIds = new Set(
    (data?.payouts ?? [])
      .filter((payout) => payout.status === 'PENDING' || payout.status === 'TRANSFERRED')
      .flatMap((payout) => payout.commissionIds ?? []),
  )
  const pendingIds = data?.commissions.filter((c) => c.status === 'PENDING').map((c) => c.id) ?? []
  const payableIds =
    data?.commissions
      .filter((c) => c.status === 'PAYABLE' && !inFlightIds.has(c.id))
      .map((c) => c.id) ?? []
  const queue = payoutQueueLabel(openPayoutStatus, payableMinor)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    await queryClient.invalidateQueries({ queryKey: ['affiliate', affiliateId] })
    await queryClient.invalidateQueries({ queryKey: ['affiliate', affiliateId, 'earnings'] })
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/affiliates/${affiliateId}`} className="text-sm font-medium hover:underline">
            {name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {queue ? `${queue} · ` : ''}
            {formatUsd(pendingMinor)} pending · {formatUsd(payableMinor)} payable ·{' '}
            <ConnectStatusBadge status={connectStatus} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pendingIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={mark.isPending}
              onClick={async () => {
                for (const commissionId of pendingIds) {
                  await mark.mutateAsync({
                    commissionId,
                    idempotencyKey: newIdempotencyKey('payable'),
                  })
                }
                await refresh()
              }}
            >
              Mark {formatUsd(pendingMinor)} payable
            </Button>
          )}
          {payableIds.length > 0 && !openPayoutStatus && (
            <Button
              size="sm"
              disabled={pay.isPending || !payoutsEnabled}
              title={
                payoutsEnabled
                  ? undefined
                  : 'Connect payouts are blocked until payoutsEnabled is true'
              }
              onClick={async () => {
                if (
                  !window.confirm(
                    `Pay ${formatUsd(payableMinor)} to ${name} from frozen commissions?`,
                  )
                )
                  return
                await pay.mutateAsync({
                  commissionIds: payableIds,
                  payeeRef: `affiliate:${affiliateId}`,
                  idempotencyKey: newIdempotencyKey('payout'),
                })
                await refresh()
              }}
            >
              Pay {formatUsd(payableMinor)}
            </Button>
          )}
          {openPayoutStatus === 'PENDING' && (
            <p className="text-xs text-muted-foreground">
              Sending — waiting for Stripe to confirm the transfer.
            </p>
          )}
          {openPayoutStatus === 'TRANSFERRED' && (
            <p className="text-xs text-muted-foreground">
              Transferred to the connected account — not yet received at the bank.
            </p>
          )}
          {payableIds.length > 0 && !payoutsEnabled && (
            <p className="text-xs text-muted-foreground">
              Connect payout is blocked until status is Ready.
            </p>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide ledger' : 'Show ledger'}
          </Button>
        </div>
        {open && data && <CommissionLedger commissions={data.commissions} payouts={data.payouts} />}
      </CardContent>
    </Card>
  )
}
