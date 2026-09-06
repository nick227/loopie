import { useParams } from 'react-router-dom'
import { useAdminGetBusiness, useAdminUpdateBusinessLicense } from '@project/sdk'
import { useState } from 'react'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function AdminBusinessDetailPage() {
  const { id } = useParams()
  const businessId = id as string

  const {
    data: bizData,
    isLoading,
    refetch,
  } = useAdminGetBusiness({ path: { businessId } }, { enabled: !!businessId })

  const updateLicense = useAdminUpdateBusinessLicense()

  const [isUpdating, setIsUpdating] = useState(false)

  if (isLoading) return <Skeleton className="h-[400px]" />
  if (!bizData?.data) return <div>Business not found</div>

  const biz = bizData.data
  const license = biz.license

  const handleGrant = async (days: number) => {
    setIsUpdating(true)
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + days)

    await updateLicense.mutateAsync({
      path: { businessId },
      body: {
        status: 'ACTIVE',
        source: 'MANUAL',
        endsAt: endsAt.toISOString(),
      },
    })

    refetch()
    setIsUpdating(false)
  }

  const handleSuspend = async () => {
    setIsUpdating(true)
    await updateLicense.mutateAsync({
      path: { businessId },
      body: {
        status: 'SUSPENDED',
        source: 'MANUAL',
        endsAt: license.endsAt, // Keep the original end date
      },
    })
    refetch()
    setIsUpdating(false)
  }

  const handleReactivate = async () => {
    setIsUpdating(true)
    await updateLicense.mutateAsync({
      path: { businessId },
      body: {
        status: 'ACTIVE',
        source: 'MANUAL',
        endsAt: license.endsAt,
      },
    })
    refetch()
    setIsUpdating(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        variant="detail"
        title={biz.name}
        description={`Tenant ID: ${biz.id}`}
        breadcrumb={{ label: 'Businesses', to: '/admin/businesses' }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UniversalRow title="Slug" subtitle={biz.slug ?? 'N/A'} />
            <UniversalRow title="Owner" subtitle={biz.ownerEmail ?? 'No owner'} />
            <UniversalRow title="Members" subtitle={String(biz.memberCount)} />
            <UniversalRow title="Created" subtitle={new Date(biz.createdAt).toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Affiliate Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Attribution data will load here...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License & Entitlements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UniversalRow
              title="Status"
              subtitle={license.status}
              trailing={
                <span className="text-sm font-medium">
                  {license.isEntitled ? 'Active' : 'Not Entitled'}
                </span>
              }
            />
            <UniversalRow
              title="Expiration"
              subtitle={license.endsAt ? new Date(license.endsAt).toLocaleDateString() : 'Never'}
            />
            <UniversalRow title="Source" subtitle={license.source} />

            <div className="pt-4 border-t flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isUpdating}
                onClick={() => handleGrant(30)}
              >
                Grant 30d
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isUpdating}
                onClick={() => handleGrant(90)}
              >
                Grant 90d
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isUpdating}
                onClick={() => handleGrant(365)}
              >
                Grant 1yr
              </Button>
              {license.status === 'ACTIVE' ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isUpdating}
                  onClick={handleSuspend}
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  disabled={isUpdating}
                  onClick={handleReactivate}
                >
                  Reactivate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
