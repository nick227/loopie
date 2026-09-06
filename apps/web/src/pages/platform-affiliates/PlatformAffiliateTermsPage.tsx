import { useGetMyPlatformAffiliate } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { ExportImportActions } from '@/components/ui/ExportImportActions'

interface MyPlatformAffiliate {
  referralCode?: string | null
  managerId?: string | null
  affiliateRateOverrideBps?: number | null
  managerShareOverrideBps?: number | null
  deal?: {
    name?: string | null
    affiliateRateBps?: number | null
    managerShareBps?: number | null
  } | null
  class?: {
    name?: string | null
    defaultDeal?: { affiliateRateBps?: number | null; managerShareBps?: number | null } | null
  } | null
}

export function PlatformAffiliateTermsPage() {
  const { data, isLoading } = useGetMyPlatformAffiliate()

  if (isLoading) return <Skeleton className="h-64 w-full" />

  const affiliate = (data as { data?: MyPlatformAffiliate } | undefined)?.data
  if (!affiliate) return null

  const activeDeal = affiliate.deal || affiliate.class?.defaultDeal
  const effectiveRate = affiliate.affiliateRateOverrideBps ?? activeDeal?.affiliateRateBps ?? 0
  const effectiveManagerRate = affiliate.managerShareOverrideBps ?? activeDeal?.managerShareBps ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        variant="detail"
        title="My Terms"
        description="Your commercial terms and commission rates."
        secondaryActions={
          <ExportImportActions
            onExportCsv={() => alert('Export CSV')}
            onExportGoogleSheets={() => alert('Export Google Sheets')}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Commercial Terms</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <UniversalRow title="Referral Code" subtitle={affiliate.referralCode || 'None'} />
          <UniversalRow
            title="Class / Deal"
            subtitle={affiliate.deal?.name || affiliate.class?.name || 'Standard'}
          />
          <UniversalRow
            title="Direct Commission Rate"
            trailing={
              <span className="font-semibold text-green-600 text-lg">
                {(effectiveRate / 100).toFixed(2)}%
              </span>
            }
          />
          {affiliate.managerId && (
            <UniversalRow
              title="Manager Override Rate"
              trailing={
                <span className="font-semibold text-green-600 text-lg">
                  {(effectiveManagerRate / 100).toFixed(2)}%
                </span>
              }
            />
          )}

          <div className="p-4 bg-muted/50 text-sm text-muted-foreground border-t">
            <p>
              Your direct commission rate is applied to the membership revenue of any businesses you
              refer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
