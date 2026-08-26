import { useAffiliateEarnings, useAffiliates, useMarkCommissionPayable, useCreatePayout } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { formatUsd, newIdempotencyKey } from '@/lib/money'
import { useState } from 'react'

export function AffiliatePayoutsPage() {
  const list = useAffiliates({ limit: 100 })
  const items = list.data?.pages.flatMap((p) => p.data) ?? []
  const [selected, setSelected] = useState('')
  if (list.isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payouts</h1>
      <AffiliateNav />
      <select className="h-9 w-full rounded border border-input-border bg-transparent px-3 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Select affiliate</option>
        {items.map((row) => (
          <option key={row.id} value={row.id}>{row.name}</option>
        ))}
      </select>
      {selected ? <PayeePanel affiliateId={selected} /> : null}
    </div>
  )
}

function PayeePanel({ affiliateId }: { affiliateId: string }) {
  const earnings = useAffiliateEarnings(affiliateId)
  const mark = useMarkCommissionPayable()
  const pay = useCreatePayout()
  const data = earnings.data?.data
  if (earnings.isLoading) return <Skeleton className="h-24 w-full" />
  if (!data) return null
  const payableIds = data.commissions.filter((c) => c.status === 'PAYABLE').map((c) => c.id)

  return (
    <Card>
      <CardContent className="py-4 space-y-3 text-sm">
        <p>Payable {formatUsd(data.payableMinor)}</p>
        {data.commissions.filter((c) => c.status === 'PENDING').map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant="outline"
            onClick={() => mark.mutate({ commissionId: c.id, idempotencyKey: newIdempotencyKey('payable') })}
          >
            Mark {formatUsd(c.amountMinor)} payable
          </Button>
        ))}
        {payableIds.length > 0 && (
          <Button
            size="sm"
            onClick={() =>
              pay.mutate({
                commissionIds: payableIds,
                payeeRef: `affiliate:${affiliateId}`,
                idempotencyKey: newIdempotencyKey('payout'),
              })
            }
          >
            Pay payable commissions
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
