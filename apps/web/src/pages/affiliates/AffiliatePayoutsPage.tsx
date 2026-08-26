import { useQueryClient } from '@tanstack/react-query'
import { useAffiliateEarnings, useAffiliates, useMarkCommissionPayable, useCreatePayout } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { CommissionLedger } from '@/components/affiliates/CommissionLedger'
import { formatUsd, newIdempotencyKey } from '@/lib/money'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function AffiliatePayoutsPage() {
  const list = useAffiliates({ limit: 100 })
  const items = list.data?.pages.flatMap((p) => p.data) ?? []
  const owed = [...items]
    .filter((row) => row.pendingMinor > 0 || row.payableMinor > 0)
    .sort((a, b) => b.payableMinor + b.pendingMinor - (a.payableMinor + a.pendingMinor))

  if (list.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payouts</h1>
      <AffiliateNav />
      <p className="text-sm text-muted-foreground">Frozen commissions only — there is no separate affiliate balance.</p>
      {owed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody is owed right now.</p>
      ) : (
        owed.map((row) => <OwedRow key={row.id} affiliateId={row.id} name={row.name} pendingMinor={row.pendingMinor} payableMinor={row.payableMinor} />)
      )}
    </div>
  )
}

function OwedRow({
  affiliateId,
  name,
  pendingMinor,
  payableMinor,
}: {
  affiliateId: string
  name: string
  pendingMinor: number
  payableMinor: number
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const earnings = useAffiliateEarnings(affiliateId)
  const mark = useMarkCommissionPayable()
  const pay = useCreatePayout()
  const data = earnings.data?.data
  const pendingIds = data?.commissions.filter((c) => c.status === 'PENDING').map((c) => c.id) ?? []
  const payableIds = data?.commissions.filter((c) => c.status === 'PAYABLE').map((c) => c.id) ?? []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    await queryClient.invalidateQueries({ queryKey: ['affiliate', affiliateId] })
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/affiliates/${affiliateId}`} className="text-sm font-medium hover:underline">{name}</Link>
          <p className="text-xs text-muted-foreground">
            {formatUsd(pendingMinor)} pending · {formatUsd(payableMinor)} payable
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
                  await mark.mutateAsync({ commissionId, idempotencyKey: newIdempotencyKey('payable') })
                }
                await refresh()
              }}
            >
              Mark {formatUsd(pendingMinor)} payable
            </Button>
          )}
          {payableIds.length > 0 && (
            <Button
              size="sm"
              disabled={pay.isPending}
              onClick={async () => {
                if (!window.confirm(`Pay ${formatUsd(payableMinor)} to ${name} from frozen commissions?`)) return
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
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide ledger' : 'Show ledger'}
          </Button>
        </div>
        {open && data && <CommissionLedger commissions={data.commissions} payouts={data.payouts} />}
      </CardContent>
    </Card>
  )
}
