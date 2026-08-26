import { useAffiliateEarnings, useMyAffiliate } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { CommissionLedger } from '@/components/affiliates/CommissionLedger'
import { ConnectStatusBadge } from '@/components/affiliates/ConnectStatusBadge'
import { SetUpPayoutsButton, useConnectReturn } from '@/components/affiliates/SetUpPayoutsButton'
import { formatUsd } from '@/lib/money'

export function AffiliatePortalPayoutsPage() {
  const me = useMyAffiliate()
  const affiliate = me.data?.data
  const earnings = useAffiliateEarnings(affiliate?.id ?? '')
  const data = earnings.data?.data
  useConnectReturn(affiliate?.id ?? '')
  if (me.isLoading || earnings.isLoading) return <Skeleton className="h-48 w-full" />
  if (!affiliate || !data) return <p className="text-muted-foreground">No payouts yet.</p>

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Payouts</h1>
      <Card>
        <CardContent className="py-4 space-y-3">
          <p className="text-sm">
            Paid {formatUsd(data.paidMinor)} · Payable {formatUsd(data.payableMinor)} · Pending {formatUsd(data.pendingMinor)}
          </p>
          <p className="text-xs text-muted-foreground">
            These amounts are frozen commissions, not a live balance. <ConnectStatusBadge status={affiliate.connectStatus} />
          </p>
          <SetUpPayoutsButton affiliateId={affiliate.id} connectStatus={affiliate.connectStatus} />
          <CommissionLedger commissions={data.commissions} payouts={data.payouts} />
        </CardContent>
      </Card>
    </div>
  )
}
