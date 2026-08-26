import { useMyAffiliate, useAffiliateEarnings } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { CopyText } from '@/components/affiliates/CopyText'
import { SplitPreview } from '@/components/affiliates/SplitPreview'
import { CommissionLedger } from '@/components/affiliates/CommissionLedger'
import { formatBps, formatUsd } from '@/lib/money'
import { ExternalLink } from 'lucide-react'

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
        <CardContent className="py-4 space-y-3">
          <p className="text-sm font-medium">Your referral link</p>
          <CopyText value={affiliate.referralUrl} />
          <p className="text-sm">Your deal is {formatBps(affiliate.commissionRateBps)} of each sale.</p>
          {affiliate.destinationPageName && affiliate.destinationHostedUrl ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              Sends visitors to {affiliate.destinationPageName} —{' '}
              <a href={affiliate.destinationHostedUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                {affiliate.destinationHostedUrl} <ExternalLink size={10} />
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No landing page is attached yet. Ask an admin to set a destination.</p>
          )}
          {affiliate.eligibilityWindowDays != null && (
            <p className="text-xs text-muted-foreground">Sales count if they close within {affiliate.eligibilityWindowDays} days of the click.</p>
          )}
          <SplitPreview
            rateBps={affiliate.commissionRateBps}
            managerShareBps={affiliate.managerShareBps}
            hasManager={!!affiliate.managerId}
          />
        </CardContent>
      </Card>
      {sums && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <p className="text-sm">
              Pending {formatUsd(sums.pendingMinor)} · Payable {formatUsd(sums.payableMinor)} · Paid {formatUsd(sums.paidMinor)}
            </p>
            <CommissionLedger commissions={sums.commissions.slice(0, 5)} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
