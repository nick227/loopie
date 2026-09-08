import { useGetPlatformAffiliateClients } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { ExportImportActions } from '@/components/ui/ExportImportActions'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { Card, CardContent } from '@/components/ui/Card'

interface AffiliateClientAttribution {
  businessId: string
  affiliateId: string
  affiliateRateBps?: number | null
  managerShareBps?: number | null
  attributedAt: string
  _accumulatedEarnings: number
  business: {
    name: string
    isLicensed: boolean
    platformAffiliateId?: string | null
  }
}

export function PlatformAffiliateClientsPage() {
  const { data, isLoading } = useGetPlatformAffiliateClients({ limit: 50 })

  if (isLoading) return <Skeleton className="h-[400px] w-full" />

  const attributions =
    (data as { pages: { data: AffiliateClientAttribution[] }[] } | undefined)?.pages.flatMap(
      (p) => p.data,
    ) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Clients"
        description="View your referred businesses, their license status, and your attribution rates."
        secondaryActions={
          <ExportImportActions
            onExportCsv={() => alert('Export CSV')}
            onExportGoogleSheets={() => alert('Export Google Sheets')}
            onImportCsv={() => alert('Import CSV')}
          />
        }
      />

      <Card>
        <CardContent className="p-0">
          {attributions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No clients referred yet. Share your link to get started!
            </div>
          )}
          {attributions.map((attr: AffiliateClientAttribution) => {
            const isDirect = attr.affiliateId === attr.business.platformAffiliateId
            const rate = isDirect ? attr.affiliateRateBps : attr.managerShareBps

            return (
              <UniversalRow
                key={attr.businessId}
                title={attr.business.name}
                subtitle={`Joined: ${new Date(attr.attributedAt).toLocaleDateString()} · Rate: ${((rate ?? 0) / 100).toFixed(2)}% ${isDirect ? '' : '(Override)'}`}
                trailing={
                  <div className="text-right">
                    <div
                      className={
                        attr.business.isLicensed
                          ? 'text-green-600 font-medium text-sm'
                          : 'text-muted-foreground text-sm'
                      }
                    >
                      {attr.business.isLicensed ? 'Active License' : 'Inactive'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Earnings: ${(attr._accumulatedEarnings / 100).toFixed(2)}
                    </div>
                  </div>
                }
              />
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
