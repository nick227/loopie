import { useMemo, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, useCampaign, useCreatives, useUpdateCampaign } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CampaignNav } from '@/components/campaigns/CampaignNav'
import { CreativeRow } from '@/components/campaigns/CreativeRow'
import { AttachCreativeForm } from '@/components/campaigns/AttachCreativeForm'
import { Image, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function CampaignCreativesPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const campaignQuery = useCampaign(campaignId!)
  const creativesQuery = useCreatives()
  const updateCampaign = useUpdateCampaign()

  const campaign = campaignQuery.data?.data
  const library = useFlatPages(creativesQuery)
  const creativeIds = campaign?.creativeIds
  const creativeIdSet = useMemo(() => new Set(creativeIds ?? []), [creativeIds])
  const attached = library.filter((creative) => creativeIdSet.has(creative.id))
  const available = library.filter((creative) => !creativeIdSet.has(creative.id))

  const attach = useCallback(
    async (creativeId: string) => {
      if (!creativeIds) return
      try {
        await updateCampaign.mutateAsync({
          campaignId: campaignId!,
          creativeIds: [...creativeIds, creativeId],
        })
      } catch (err) {
        throw err instanceof ApiError || err instanceof Error
          ? err
          : new Error('Could not attach creative')
      }
    },
    [campaignId, creativeIds, updateCampaign],
  )

  if (campaignQuery.isLoading || creativesQuery.isLoading)
    return <Skeleton className="h-48 w-full" />
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Creatives attached to this campaign. The library is reusable.
        </p>
        <div className="flex gap-2">
          <Link to="/creatives">
            <Button variant="outline" size="sm">
              Browse library
            </Button>
          </Link>
          <Link to={`/campaigns/${campaignId}/creatives/new`}>
            <Button size="sm">
              <Plus size={14} /> New creative
            </Button>
          </Link>
        </div>
      </div>

      {attached.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No creatives attached"
          description="Attach one from the library or create a new creative."
        />
      ) : (
        attached.map((creative) => (
          <Link key={creative.id} to={`/creatives/${creative.id}`}>
            <CreativeRow creative={creative} />
          </Link>
        ))
      )}

      <AttachCreativeForm
        key={available.map((creative) => creative.id).join(',')}
        creatives={available}
        pending={updateCampaign.isPending}
        onAttach={attach}
      />
    </div>
  )
}
