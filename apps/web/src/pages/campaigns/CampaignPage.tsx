import { useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useAdUnits,
  useAuthorizeCampaignBudget,
  useCampaign,
  useCampaignFunding,
  useCampaignLeads,
  useCampaignPerformance,
  useCreatives,
  useDeployments,
  useLandingPages,
  useUpdateAdUnit,
} from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { CampaignPerformanceSummary } from '@/components/campaigns/CampaignPerformanceSummary'
import { CampaignAds } from '@/components/campaigns/CampaignAds'
import { CampaignLeads } from '@/components/campaigns/CampaignLeads'
import { CampaignMoney } from '@/components/campaigns/CampaignMoney'
import { buildCampaignAds, PLATFORM_LABEL } from '@/components/campaigns/buildCampaignAds'
import { ExternalLink } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
}

export function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const campaignQuery = useCampaign(campaignId!)
  const performanceQuery = useCampaignPerformance(campaignId!)
  const fundingQuery = useCampaignFunding(campaignId!)
  const leadsQuery = useCampaignLeads(campaignId!)
  const unitsQuery = useAdUnits({ campaignId: campaignId! })
  const deploymentsQuery = useDeployments(campaignId!)
  const creativesQuery = useCreatives()
  const landingPagesQuery = useLandingPages()
  const updateAdUnit = useUpdateAdUnit()
  const authorize = useAuthorizeCampaignBudget()

  const campaign = campaignQuery.data?.data
  const units = useFlatPages(unitsQuery)
  const creatives = useFlatPages(creativesQuery)
  const landingPages = useFlatPages(landingPagesQuery)
  const leads = useFlatPages(leadsQuery)
  const creativeName = useMemo(
    () => new Map(creatives.map((creative) => [creative.id, creative.name])),
    [creatives],
  )
  const ads = useMemo(
    () => buildCampaignAds(units, deploymentsQuery.data?.data ?? [], creativeName),
    [units, deploymentsQuery.data?.data, creativeName],
  )
  const activate = useCallback(
    (adUnitId: string) => updateAdUnit.mutate({ adUnitId, status: 'ACTIVE' }),
    [updateAdUnit],
  )

  if (campaignQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  const destinationPage = landingPages.find((lp) => lp.hostedUrl === campaign.destinationUrl)
  const dates = `${new Date(campaign.startDate).toLocaleDateString()} – ${
    campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'open'
  }`

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {STATUS_LABEL[campaign.status] ?? campaign.status} · {dates}
            {campaign.platforms.length
              ? ` · ${campaign.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(', ')}`
              : ''}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{campaign.name}</h1>
        </div>
        <Link to={`/campaigns/${campaignId}/edit`} className="text-sm underline underline-offset-4">
          Edit
        </Link>
      </div>

      <CampaignPerformanceSummary performance={performanceQuery.data?.data} />

      <CampaignAds
        campaignId={campaignId!}
        ads={ads}
        activating={updateAdUnit.isPending}
        onActivate={activate}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide uppercase">Destination</h2>
        {campaign.destinationUrl ? (
          <div className="space-y-1">
            <a
              href={campaign.destinationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm hover:underline inline-flex items-center gap-1"
            >
              {campaign.destinationUrl} <ExternalLink size={12} />
            </a>
            {destinationPage ? (
              <p className="text-xs text-muted-foreground">
                Landing page &quot;{destinationPage.name}&quot; —{' '}
                <Link to={`/landing-pages/${destinationPage.id}`} className="underline">
                  edit
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No destination yet.{' '}
            <Link to={`/campaigns/${campaignId}/edit`} className="underline">
              Set a URL
            </Link>
            {' · '}
            <Link to="/landing-pages" className="underline">
              Landing pages
            </Link>
          </p>
        )}
      </section>

      <CampaignLeads
        leads={leads}
        hasMore={!!leadsQuery.hasNextPage}
        loadingMore={leadsQuery.isFetchingNextPage}
        onLoadMore={() => leadsQuery.fetchNextPage()}
      />

      {fundingQuery.data?.data ? (
        <CampaignMoney
          campaignId={campaignId!}
          funding={fundingQuery.data.data}
          pending={authorize.isPending}
          onAuthorize={(amountMinor, idempotencyKey) =>
            authorize
              .mutateAsync({
                campaignId: campaignId!,
                amountMinor,
                currency: 'USD',
                idempotencyKey,
              })
              .then(() => undefined)
          }
        />
      ) : null}
    </div>
  )
}
