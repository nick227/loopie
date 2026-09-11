import {
  useGetMyPlatformAffiliate,
  useGetPlatformAffiliateOverview,
  useGetMyPlatformAffiliateLedger,
} from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { CopyText, CopyButton } from '@/components/affiliates/CopyText'

const formatCurrency = (minor: number) => `$${(minor / 100).toFixed(2)}`
const formatRate = (bps: number) => `${(bps / 100).toFixed(2)}%`

interface PlatformAffiliateDeal {
  affiliateRateBps?: number | null
}
interface PlatformAffiliateClassRef {
  defaultDeal?: PlatformAffiliateDeal | null
}
interface MyPlatformAffiliate {
  referralCode: string
  isActive: boolean
  affiliateRateOverrideBps?: number | null
  deal?: PlatformAffiliateDeal | null
  class?: PlatformAffiliateClassRef | null
}

interface Overview {
  pendingEarningsMinor: number
  payableEarningsMinor: number
  paidEarningsMinor: number
  clients: number
}

interface LedgerRow {
  id: string
  businessName: string
  clientPaymentMinor: number
  rateBps: number
  amountMinor: number
  status: string
  createdAt: string
}

function currentRateBps(affiliate: MyPlatformAffiliate | undefined) {
  if (!affiliate) return null
  if (typeof affiliate.affiliateRateOverrideBps === 'number')
    return affiliate.affiliateRateOverrideBps
  const deal = affiliate.deal ?? affiliate.class?.defaultDeal
  return deal?.affiliateRateBps ?? null
}

const STATUS_STYLE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PAYABLE: 'bg-orange-100 text-orange-800',
  PENDING: 'bg-blue-100 text-blue-800',
  REVERSED: 'bg-red-100 text-red-800',
}

export function AffiliateProgramPage() {
  const { data: affiliateData, isLoading: affiliateLoading } = useGetMyPlatformAffiliate()
  const { data: overviewData, isLoading: overviewLoading } = useGetPlatformAffiliateOverview()
  const ledgerQuery = useGetMyPlatformAffiliateLedger()

  if (affiliateLoading || overviewLoading) return <Skeleton className="h-[400px] w-full" />

  const affiliate = (affiliateData as { data?: MyPlatformAffiliate } | undefined)?.data
  const overview = (overviewData as { data?: Overview } | undefined)?.data
  const ledgerPages = ledgerQuery.data?.pages as { data: LedgerRow[] }[] | undefined
  const ledger = ledgerPages?.flatMap((page) => page.data) ?? []

  const rateBps = currentRateBps(affiliate)
  const referralLink = affiliate
    ? `${window.location.origin}/register?ref=${affiliate.referralCode}`
    : ''

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Affiliate Program"
        description="Refer new businesses to LOOPIE and earn a share of what they pay."
      />

      <Card>
        <CardHeader>
          <CardTitle>Referral code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {affiliate ? (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-mono text-2xl font-semibold tracking-wide">
                  {affiliate.referralCode}
                </p>
                <CopyButton value={affiliate.referralCode} />
              </div>
            </div>
          ) : null}
          {affiliate ? (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mt-1 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Referral link
                  </p>
                  <a
                    href={referralLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {referralLink}
                  </a>
                </div>
                <CopyButton value={referralLink} />
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current commission
              </p>
              <p className="mt-1 text-lg font-semibold">
                {typeof rateBps === 'number' ? formatRate(rateBps) : 'Not set yet'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 text-lg font-semibold">
                {affiliate?.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Referrals</p>
              <p className="mt-1 text-lg font-semibold">{overview?.clients ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(overview?.pendingEarningsMinor ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase text-orange-500">Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-orange-500">
              {formatCurrency(overview?.payableEarningsMinor ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase text-green-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">
              {formatCurrency(overview?.paidEarningsMinor ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No referrals have paid LOOPIE yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="p-3">Referred client</th>
                    <th className="p-3">Client payment</th>
                    <th className="p-3">Rate at the time</th>
                    <th className="p-3">Commission earned</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.businessName}</td>
                      <td className="p-3">{formatCurrency(row.clientPaymentMinor)}</td>
                      <td className="p-3">{formatRate(row.rateBps)}</td>
                      <td className="p-3 font-medium">{formatCurrency(row.amountMinor)}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ledgerQuery.hasNextPage ? (
            <div className="p-4 text-center">
              <button
                onClick={() => ledgerQuery.fetchNextPage()}
                disabled={ledgerQuery.isFetchingNextPage}
                className="text-sm text-blue-500 hover:underline"
              >
                {ledgerQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
