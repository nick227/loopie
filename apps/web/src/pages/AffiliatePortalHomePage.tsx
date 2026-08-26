import { useMyAffiliate, useAffiliateEarnings } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatBps, formatUsd } from '@/lib/money'

export function AffiliatePortalHomePage() {
  const me = useMyAffiliate()
  const affiliate = me.data?.data
  const earnings = useAffiliateEarnings(affiliate?.id ?? '')
  if (me.isLoading) return <Skeleton className="h-48 w-full" />
  if (!affiliate) return <p className="text-muted-foreground">No affiliate record.</p>
  const sums = earnings.data?.data

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{affiliate.name}</h1>
      <Card>
        <CardContent className="py-4 space-y-2 text-sm">
          <p>Your deal {formatBps(affiliate.commissionRateBps)} of sale</p>
          <p>Manager share {formatBps(affiliate.managerShareBps)} of that commission</p>
          <p className="text-xs text-muted-foreground break-all">{affiliate.referralUrl}</p>
        </CardContent>
      </Card>
      {sums && (
        <Card>
          <CardContent className="py-4 text-sm">
            Pending {formatUsd(sums.pendingMinor)} · Payable {formatUsd(sums.payableMinor)} · Paid {formatUsd(sums.paidMinor)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
