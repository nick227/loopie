import { useLocation, useParams } from 'react-router-dom'
import {
  useAffiliate,
  useAffiliateEarnings,
  usePauseAffiliate,
  useResumeAffiliate,
} from '@project/sdk'
import { AffiliateAssignmentForm } from '@/components/affiliates/AffiliateAssignmentForm'
import { CommissionLedger } from '@/components/affiliates/CommissionLedger'
import { CopyText } from '@/components/affiliates/CopyText'
import { SplitPreview } from '@/components/affiliates/SplitPreview'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatBps, formatUsd } from '@/lib/money'
import { ConnectStatusBadge } from '@/components/affiliates/ConnectStatusBadge'
import { SetUpPayoutsButton, useConnectReturn } from '@/components/affiliates/SetUpPayoutsButton'

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
  useConnectReturn(affiliateId!)

  if (affiliateQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!affiliate) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <PageHeader
        variant="detail"
        title={affiliate.name}
        breadcrumb={{ label: 'Directory', to: '/affiliates' }}
      />
      {initialPassword && (
        <div className="rounded border px-3 py-2 space-y-1">
          <p className="text-sm">Login password (shown once)</p>
          <CopyText value={initialPassword} />
        </div>
      )}
      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-sm">
            {affiliate.className ?? 'No class'} · {formatBps(affiliate.commissionRateBps)} of sale
            {affiliate.managerName ? ` · reports to ${affiliate.managerName}` : ''}
            {' · '}
            <ConnectStatusBadge status={affiliate.connectStatus} />
          </p>
          <CopyText value={affiliate.referralUrl} />
          <SplitPreview
            rateBps={affiliate.commissionRateBps}
            managerShareBps={affiliate.managerShareBps}
            hasManager={!!affiliate.managerId}
          />
        </CardContent>
      </Card>
      <AffiliateAssignmentForm affiliate={affiliate} />
      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-sm font-medium">Payouts</p>
          <SetUpPayoutsButton affiliateId={affiliate.id} connectStatus={affiliate.connectStatus} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-sm">
            Pending {formatUsd(affiliate.pendingMinor)} · Payable{' '}
            {formatUsd(affiliate.payableMinor)} · Paid {formatUsd(affiliate.paidMinor)}
          </p>
          {earnings && (
            <CommissionLedger commissions={earnings.commissions} payouts={earnings.payouts} />
          )}
        </CardContent>
      </Card>
      {affiliate.isActive ? (
        <Button
          variant="outline"
          onClick={() => {
            if (
              window.confirm(
                'Pause this person? New referral clicks stop. Past commissions stay frozen.',
              )
            ) {
              pause.mutate(affiliate.id)
            }
          }}
        >
          Pause
        </Button>
      ) : (
        <Button onClick={() => resume.mutate(affiliate.id)}>Resume</Button>
      )}
    </div>
  )
}
