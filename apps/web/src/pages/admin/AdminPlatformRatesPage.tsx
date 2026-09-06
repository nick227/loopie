import {
  useAdminListPlatformAffiliates,
  useAdminListPlatformClasses,
  useAdminListPlatformDeals,
  useAdminUpdatePlatformAffiliate,
} from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { Button } from '@/components/ui/Button'
import { useQueryClient } from '@tanstack/react-query'

interface PlatformAffiliateDeal {
  id: string
  name: string
  affiliateRateBps?: number | null
  managerShareBps?: number | null
}

interface PlatformAffiliateClass {
  id: string
  name: string
  defaultDeal?: { name?: string | null } | null
}

interface PlatformAffiliate {
  id: string
  name?: string | null
  managerId?: string | null
  platformAffiliateClass?: { name?: string | null } | null
  customDeal?: { name?: string | null } | null
  customRateBps?: number | null
  manager?: { name?: string | null } | null
}

export function AdminPlatformRatesPage() {
  const queryClient = useQueryClient()
  const { data: affiliatesData, isLoading: affiliatesLoading } = useAdminListPlatformAffiliates()
  const { data: classesData, isLoading: classesLoading } = useAdminListPlatformClasses()
  const { data: dealsData, isLoading: dealsLoading } = useAdminListPlatformDeals()
  const updateAffiliate = useAdminUpdatePlatformAffiliate({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'platformAffiliates'] }),
  })

  if (affiliatesLoading || classesLoading || dealsLoading)
    return <Skeleton className="h-[400px] w-full" />

  const affiliates = (affiliatesData as { data?: PlatformAffiliate[] } | undefined)?.data ?? []
  const classes = (classesData as { data?: PlatformAffiliateClass[] } | undefined)?.data ?? []
  const deals = (dealsData as { data?: PlatformAffiliateDeal[] } | undefined)?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Rates & Deals Configuration"
        description="Explicit control over commercial terms, classes, and overrides for platform affiliates."
      />

      <Card>
        <CardHeader>
          <CardTitle>Affiliate Assignments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {affiliates.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No affiliates found.
            </div>
          )}
          {affiliates.map((aff: PlatformAffiliate) => (
            <div
              key={aff.id}
              className="p-4 border-b last:border-0 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
            >
              <div>
                <div className="font-semibold text-lg">{aff.name ?? aff.id}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Class:{' '}
                  <span className="font-medium text-foreground">
                    {aff.platformAffiliateClass?.name ?? 'None'}
                  </span>
                  {aff.customDeal && (
                    <span className="ml-2">
                      · Deal Override:{' '}
                      <span className="font-medium text-foreground">{aff.customDeal.name}</span>
                    </span>
                  )}
                  {typeof aff.customRateBps === 'number' && (
                    <span className="ml-2">
                      · Rate Override:{' '}
                      <span className="font-medium text-foreground">
                        {(aff.customRateBps / 100).toFixed(2)}%
                      </span>
                    </span>
                  )}
                </div>
                {aff.manager && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Manager:{' '}
                    <span className="font-medium text-foreground">
                      {aff.manager.name ?? aff.managerId}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rate = prompt('Enter new rate override (e.g. 25.5 for 25.5%):')
                    if (rate && !isNaN(Number(rate))) {
                      updateAffiliate.mutate({
                        id: aff.id,
                        affiliateRateOverrideBps: Math.round(Number(rate) * 100),
                      })
                    }
                  }}
                >
                  Change rate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const managerId = prompt('Enter new manager affiliate ID:')
                    if (managerId) {
                      updateAffiliate.mutate({ id: aff.id, managerId })
                    }
                  }}
                >
                  Assign manager
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rate = prompt('Enter new manager rate override (e.g. 5 for 5%):')
                    if (rate && !isNaN(Number(rate))) {
                      updateAffiliate.mutate({
                        id: aff.id,
                        managerShareOverrideBps: Math.round(Number(rate) * 100),
                      })
                    }
                  }}
                >
                  Change mgr rate
                </Button>
                {(typeof aff.customRateBps === 'number' || aff.customDeal) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      if (
                        confirm('Are you sure you want to end all overrides for this affiliate?')
                      ) {
                        updateAffiliate.mutate({
                          id: aff.id,
                          affiliateRateOverrideBps: null,
                          managerShareOverrideBps: null,
                          dealId: null,
                        })
                      }
                    }}
                  >
                    End override
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Classes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {classes.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No classes configured.
              </div>
            )}
            {classes.map((cls: PlatformAffiliateClass) => (
              <UniversalRow
                key={cls.id}
                title={cls.name}
                trailing={<span className="text-sm">{cls.defaultDeal?.name ?? 'None'}</span>}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {deals.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No deals configured.
              </div>
            )}
            {deals.map((deal: PlatformAffiliateDeal) => (
              <UniversalRow
                key={deal.id}
                title={deal.name}
                subtitle={`Direct: ${((deal.affiliateRateBps ?? 0) / 100).toFixed(2)}% | Manager: ${((deal.managerShareBps ?? 0) / 100).toFixed(2)}%`}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
