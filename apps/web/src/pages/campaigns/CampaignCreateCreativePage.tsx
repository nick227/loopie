import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  useAssets,
  useCampaign,
  useCreateCreative,
  useUpdateCampaign,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CampaignNav } from '@/components/campaigns/CampaignNav'
import { AssetPicker } from '@/components/campaigns/AssetPicker'
import { Image } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function CampaignCreateCreativePage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const campaignQuery = useCampaign(campaignId!)
  const assetsQuery = useAssets()
  const createCreative = useCreateCreative()
  const updateCampaign = useUpdateCampaign()

  const [name, setName] = useState('')
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const campaign = campaignQuery.data?.data
  const assets = useFlatPages(assetsQuery)

  if (campaignQuery.isLoading || assetsQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  function toggleAsset(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (assetIds.length === 0) {
      setError('Pick at least one asset.')
      return
    }
    try {
      const created = await createCreative.mutateAsync({ name, assetIds })
      const creativeId = created.data!.id
      await updateCampaign.mutateAsync({
        campaignId: campaignId!,
        creativeIds: [...campaign!.creativeIds, creativeId],
      })
      navigate(`/campaigns/${campaignId}/creatives`)
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not create creative',
      )
    }
  }

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <h2 className="text-sm font-medium">New creative</h2>
      <p className="text-xs text-muted-foreground">
        Creates a library creative and attaches it to this campaign.
      </p>

      {assets.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No assets yet"
          description="Add an image or text asset, then come back to build a creative."
          action={{ label: 'Add an asset', onClick: () => navigate('/assets/new') }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="creative-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="creative-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <AssetPicker assets={assets} selectedIds={assetIds} onToggle={toggleAsset} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={createCreative.isPending || updateCampaign.isPending}
            >
              Create and attach
            </Button>
            <Link to={`/campaigns/${campaignId}/creatives`}>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
