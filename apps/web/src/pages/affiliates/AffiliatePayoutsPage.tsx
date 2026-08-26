import { useQueryClient } from '@tanstack/react-query'
import {
  useAffiliateEarnings,
  useAffiliates,
  useMarkCommissionPayable,
  useCreatePayout,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { CommissionLedger } from '@/components/affiliates/CommissionLedger'
import { formatUsd, newIdempotencyKey } from '@/lib/money'
import { ConnectStatusBadge, payoutQueueLabel } from '@/components/affiliates/ConnectStatusBadge'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function AffiliatePayoutsPage() {
  const list = useAffiliates({ limit: 100 })
  const items = list.data?.pages.flatMap((p) => p.data) ?? []
  const owed = [...items]
    .filter((row) => row.pendingMinor > 0 || row.payableMinor > 0 || row.openPayoutStatus)
    .sort((a, b) => b.payableMinor + b.pendingMinor - (a.payableMinor + a.pendingMinor))

  if (list.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payouts</h1>
      <AffiliateNav />
      <p className="text-sm text-muted-foreground">
        Frozen commissions only — there is no separate affiliate balance.
      </p>
      {owed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody is owed right now.</p>
      ) : (
        owed.map((row) => (
          <OwedRow
            key={row.id}
            affiliateId={row.id}
            name={row.name}
            pendingMinor={row.pendingMinor}
            payableMinor={row.payableMinor}
            openPayoutStatus={row.openPayoutStatus ?? null}
            payoutsEnabled={row.payoutsEnabled}
            connectStatus={row.connectStatus}
          />
        ))
      )}
    </div>
  )
}

function OwedRow({
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
