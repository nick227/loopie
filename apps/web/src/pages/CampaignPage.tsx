import { useParams, Link } from 'react-router-dom'
import { useCampaign, useLandingPages } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Draft', ACTIVE: 'Active', PAUSED: 'Paused', ENDED: 'Ended' }

export function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data, isLoading } = useCampaign(campaignId!)
  // Landing pages are a reusable library, not owned by one campaign (see
  // docs/00-unified-ia-navigation.md "Landing Pages and Creatives Are Reusable Libraries") —
  // so "which page is this campaign pointed at" is resolved by matching destinationUrl against
  // a page's hostedUrl, not a foreign key.
  const landingPagesQuery = useLandingPages()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const campaign = data?.data
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  const landingPages = landingPagesQuery.data?.pages.flatMap((p) => p.data) ?? []
  const destinationPage = landingPages.find((lp) => lp.hostedUrl === campaign.destinationUrl)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{campaign.name}</h1>
          <p className="text-xs text-muted-foreground">
            {STATUS_LABEL[campaign.status] ?? campaign.status} · ${campaign.budget.toLocaleString()} budget
          </p>
        </div>
        <Link to={`/campaigns/${campaignId}/edit`}>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link to={`/campaigns/${campaignId}/deployments`}>
          <Button variant="outline" size="sm">
            Platforms
          </Button>
        </Link>
        <Link to={`/campaigns/${campaignId}/performance`}>
          <Button variant="outline" size="sm">
            Performance
          </Button>
        </Link>
        <Link to={`/campaigns/${campaignId}/budget`}>
          <Button variant="outline" size="sm">
            Budget
          </Button>
        </Link>
        <Link to="/landing-pages">
          <Button variant="outline" size="sm">
            Landing Pages Library
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Destination</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {campaign.destinationUrl ? (
            <>
              <a
                href={campaign.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {campaign.destinationUrl} <ExternalLink size={12} />
              </a>
              {destinationPage && (
                <p className="text-xs text-muted-foreground">
                  Points at landing page "{destinationPage.name}" —{' '}
                  <Link to={`/landing-pages/${destinationPage.id}`} className="underline">
                    edit it
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No destination set yet. Publish a landing page and use "Set as Destination" there, or{' '}
              <Link to={`/campaigns/${campaignId}/edit`} className="underline">
                set a URL directly
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Details</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Start date</p>
            <p>{new Date(campaign.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">End date</p>
            <p>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Platforms</p>
            <p>{campaign.platforms.join(', ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Creatives</p>
            <p>{campaign.creativeIds.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
