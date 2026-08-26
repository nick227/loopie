import { useAffiliateEarnings, useMyAffiliate } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatUsd } from '@/lib/money'

export function AffiliatePortalPayoutsPage() {
  const me = useMyAffiliate()
  const earnings = useAffiliateEarnings(me.data?.data?.id ?? '')
  const data = earnings.data?.data
  if (me.isLoading || earnings.isLoading) return <Skeleton className="h-48 w-full" />
  if (!data) return <p className="text-muted-foreground">No payouts yet.</p>

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Payouts</h1>
      <Card>
        <CardContent className="py-4 text-sm">
          Paid {formatUsd(data.paidMinor)} · Payable {formatUsd(data.payableMinor)} · Pending {formatUsd(data.pendingMinor)}
        </CardContent>
      </Card>
      {data.commissions.slice(0, 20).map((c) => (
        <p key={c.id} className="text-sm text-muted-foreground">
          {formatUsd(c.amountMinor)} · {c.status}
        </p>
      ))}
    </div>
  )
}
