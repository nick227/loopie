import { Link, useParams } from 'react-router-dom'
import { useAdUnits, useCampaign, useCreatives, useUpdateAdUnit } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CampaignNav } from '@/components/campaigns/CampaignNav'
import { AdUnitRow } from '@/components/campaigns/AdUnitRow'
import { PanelsTopLeft, Plus } from 'lucide-react'

export function CampaignAdUnitsPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const campaignQuery = useCampaign(campaignId!)
  const unitsQuery = useAdUnits({ campaignId: campaignId! })
  const creativesQuery = useCreatives()
  const updateAdUnit = useUpdateAdUnit()

  const campaign = campaignQuery.data?.data
  const units = unitsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const creatives = creativesQuery.data?.pages.flatMap((page) => page.data) ?? []
  const creativeName = new Map(creatives.map((creative) => [creative.id, creative.name]))

  if (campaignQuery.isLoading || unitsQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">First-party units served by LOOPIE for this campaign.</p>
        <Link to={`/campaigns/${campaignId}/ad-units/new`}>
          <Button size="sm">
            <Plus size={14} /> New ad unit
          </Button>
        </Link>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={PanelsTopLeft}
          title="No ad units yet"
          description="Create a unit to serve an attached creative on LOOPIE inventory."
        />
      ) : (
        units.map((unit) => (
          <AdUnitRow
            key={unit.id}
            unit={unit}
            creativeName={creativeName.get(unit.creativeId) ?? unit.creativeId}
            activating={updateAdUnit.isPending}
            onActivate={(adUnitId) => updateAdUnit.mutate({ adUnitId, status: 'ACTIVE' })}
          />
        ))
      )}
    </div>
  )
}
