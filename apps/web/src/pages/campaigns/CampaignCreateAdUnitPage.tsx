import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  useCampaign,
  useCreateAdUnit,
  useCreatives,
  useLandingPages,
  useUpdateCampaign,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CampaignNav } from '@/components/campaigns/CampaignNav'
import { Image } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

const FORMATS = [
  { value: 'DISPLAY_BANNER', label: 'Display banner' },
  { value: 'NATIVE', label: 'Native' },
  { value: 'EMBED', label: 'Embed' },
] as const

const selectClass =
  'flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function CampaignCreateAdUnitPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const campaignQuery = useCampaign(campaignId!)
  const creativesQuery = useCreatives()
  const pagesQuery = useLandingPages()
  const createAdUnit = useCreateAdUnit()
  const updateCampaign = useUpdateCampaign()

  const campaign = campaignQuery.data?.data
  const library = useFlatPages(creativesQuery)
  const landingPages = useFlatPages(pagesQuery)

  const [creativeId, setCreativeId] = useState('')
  const [format, setFormat] = useState<(typeof FORMATS)[number]['value']>('DISPLAY_BANNER')
  const [landingPageId, setLandingPageId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (campaignQuery.isLoading || creativesQuery.isLoading)
    return <Skeleton className="h-48 w-full" />
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  const selectedCreativeId = creativeId || library[0]?.id || ''
  const back = `/campaigns/${campaignId}`

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (!campaign!.creativeIds.includes(selectedCreativeId)) {
        await updateCampaign.mutateAsync({
          campaignId: campaignId!,
          creativeIds: [...campaign!.creativeIds, selectedCreativeId],
        })
      }
      if (!campaign!.platforms.includes('LOOPIE')) {
        await createAdUnit.mutateAsync({
          campaignId: campaignId!,
          creativeId: selectedCreativeId,
          format,
          ...(landingPageId ? { destinationLandingPageId: landingPageId } : {}),
          ...(destinationUrl ? { destinationUrl } : {}),
        })
      }
      navigate(back)
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not create ad',
      )
    }
  }

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <h1 className="text-xl font-semibold">New ad</h1>
      <p className="text-xs text-muted-foreground">An ad on this campaign runs one creative.</p>

      {library.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No creatives yet"
          description="Create a creative, then come back to run it as an ad."
          action={{
            label: 'New creative',
            onClick: () => navigate(`/campaigns/${campaignId}/creatives/new`),
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ad-unit-creative" className="text-sm font-medium">
              Creative
            </label>
            <select
              id="ad-unit-creative"
              value={selectedCreativeId}
              onChange={(e) => setCreativeId(e.target.value)}
              className={selectClass}
            >
              {library.map((creative) => (
                <option key={creative.id} value={creative.id}>
                  {creative.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ad-unit-format" className="text-sm font-medium">
              Format
            </label>
            <select
              id="ad-unit-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number]['value'])}
              className={selectClass}
            >
              {FORMATS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ad-unit-landing-page" className="text-sm font-medium">
              Destination landing page
            </label>
            <select
              id="ad-unit-landing-page"
              value={landingPageId}
              onChange={(e) => setLandingPageId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {landingPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ad-unit-destination-url" className="text-sm font-medium">
              Destination URL
            </label>
            <Input
              id="ad-unit-destination-url"
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="Optional fallback URL"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={createAdUnit.isPending || updateCampaign.isPending}
            >
              Create ad
            </Button>
            <Link to={back}>
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
