import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useGetPlatformAffiliateOverview } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { ExportImportActions } from '@/components/ui/ExportImportActions'

interface PlatformAffiliateOverviewStats {
  clients: number
  activeLicenses: number
  membershipRevenueMinor: number
  pendingEarningsMinor: number
  payableEarningsMinor: number
  paidEarningsMinor: number
}

export function PlatformAffiliateOverviewPage() {
  const { data, isLoading } = useGetPlatformAffiliateOverview()

  if (isLoading) return <Skeleton className="h-48 w-full max-w-sm" />

  const stats = (data as { data?: PlatformAffiliateOverviewStats } | undefined)?.data

  return (
    <div className="space-y-6">
      <PageHeader
        variant="detail"
        title="Overview"
        description="Track your performance, referrals, and earnings."
        secondaryActions={
          <ExportImportActions
            onExportCsv={() => alert('Export CSV')}
            onExportGoogleSheets={() => alert('Export Google Sheets')}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Referred Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.clients ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeLicenses ?? 0} active licenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue Driven
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${((stats?.membershipRevenueMinor ?? 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime membership revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              $
              {(
                ((stats?.pendingEarningsMinor ?? 0) +
                  (stats?.payableEarningsMinor ?? 0) +
                  (stats?.paidEarningsMinor ?? 0)) /
                100
              ).toFixed(2)}
            </div>
            <div className="flex justify-between gap-4 mt-4 pt-4 border-t text-sm font-medium">
              <span className="text-amber-600">
                Pending: ${((stats?.pendingEarningsMinor ?? 0) / 100).toFixed(2)}
              </span>
              <span className="text-green-600">
                Payable: ${((stats?.payableEarningsMinor ?? 0) / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                Paid: ${((stats?.paidEarningsMinor ?? 0) / 100).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground mt-4 italic">
        Earnings begin when paid memberships are enabled and processed.
      </p>
    </div>
  )
}
