import { useLocation, useParams } from 'react-router-dom'
import { useAffiliate, useAffiliateEarnings, usePauseAffiliate, useResumeAffiliate } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { formatBps, formatUsd } from '@/lib/money'

export function AffiliateDetailPage() {
  const { affiliateId } = useParams<{ affiliateId: string }>()
  const location = useLocation()
  const initialPassword = (location.state as { initialPassword?: string } | null)?.initialPassword
  const affiliateQuery = useAffiliate(affiliateId!)
  const earningsQuery = useAffiliateEarnings(affiliateId!)
  const pause = usePauseAffiliate()
  const resume = useResumeAffiliate()
  const affiliate = affiliateQuery.data?.data
  const earnings = earningsQuery.data?.data

  if (affiliateQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!affiliate) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{affiliate.name}</h1>
      <AffiliateNav />
      {initialPassword && (
        <p className="text-sm rounded border px-3 py-2">Login password (shown once): {initialPassword}</p>
      )}
      <Card>
        <CardContent className="py-4 space-y-1 text-sm">
          <p>Deal rate {formatBps(affiliate.commissionRateBps)} · manager share {formatBps(affiliate.managerShareBps)}</p>
          <p className="text-xs text-muted-foreground break-all">{affiliate.referralUrl}</p>
          <p className="text-xs text-muted-foreground">{affiliate.payoutCadence} payouts</p>
        </CardContent>
      </Card>
      {earnings && (
        <Card>
          <CardContent className="py-4 text-sm space-y-1">
            <p>Pending {formatUsd(earnings.pendingMinor)}</p>
            <p>Payable {formatUsd(earnings.payableMinor)}</p>
            <p>Paid {formatUsd(earnings.paidMinor)}</p>
          </CardContent>
        </Card>
      )}
      {affiliate.isActive ? (
        <Button variant="outline" onClick={() => pause.mutate(affiliate.id)}>Pause</Button>
      ) : (
        <Button onClick={() => resume.mutate(affiliate.id)}>Resume</Button>
      )}
    </div>
  )
}
