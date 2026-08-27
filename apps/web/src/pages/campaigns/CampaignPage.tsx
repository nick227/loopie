import { useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
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
  usePlatformConnection,
  usePushDeployment,
  useUpdateAdUnit,
  useUpdateCampaign,
} from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { CampaignPerformanceSummary } from '@/components/campaigns/CampaignPerformanceSummary'
import { CampaignIdentity, type CampaignPlatform } from '@/components/campaigns/CampaignIdentity'
import { CampaignAds } from '@/components/campaigns/CampaignAds'
import { CampaignDestination } from '@/components/campaigns/CampaignDestination'
import { CampaignLeads } from '@/components/campaigns/CampaignLeads'
import { CampaignMoney } from '@/components/campaigns/CampaignMoney'
import { buildCampaignAds } from '@/components/campaigns/buildCampaignAds'
import { useFlatPages } from '@/hooks/useFlatPages'

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
  const updateCampaign = useUpdateCampaign()
  const authorize = useAuthorizeCampaignBudget()
  const meta = usePlatformConnection('META')
  const google = usePlatformConnection('GOOGLE')
  const tiktok = usePlatformConnection('TIKTOK')
  const push = usePushDeployment(campaignId!)
  const saveChain = useRef(Promise.resolve())

  const campaign = campaignQuery.data?.data
  const units = useFlatPages(unitsQuery)
  const creatives = useFlatPages(creativesQuery)
  const landingPages = useFlatPages(landingPagesQuery)
  const leads = useFlatPages(leadsQuery)
  const creativeName = useMemo(
    () => new Map(creatives.map((creative) => [creative.id, creative.name])),
    [creatives],
  )
  const attachedIds = useMemo(() => campaign?.creativeIds ?? [], [campaign])
  const ads = useMemo(
    () => buildCampaignAds(units, deploymentsQuery.data?.data ?? [], creativeName, attachedIds),
    [units, deploymentsQuery.data?.data, creativeName, attachedIds],
  )
  const pushReady = useMemo(() => {
    const ready: Record<string, boolean> = {}
    for (const row of [meta.data?.data, google.data?.data, tiktok.data?.data]) {
      if (!row) continue
      ready[row.platform] = Boolean(row.capabilities.pushDraft && row.status === 'CONNECTED')
    }
    return ready
  }, [meta.data?.data, google.data?.data, tiktok.data?.data])
  const library = useMemo(
    () => creatives.filter((creative) => !attachedIds.includes(creative.id)),
    [creatives, attachedIds],
  )
  const activate = useCallback(
    (adUnitId: string) => updateAdUnit.mutate({ adUnitId, status: 'ACTIVE' }),
    [updateAdUnit],
  )
  const attach = useCallback(
    (creativeId: string) => {
      updateCampaign.mutate({ campaignId: campaignId!, creativeIds: [...attachedIds, creativeId] })
    },
    [attachedIds, campaignId, updateCampaign],
  )
  const save = useCallback(
    (patch: {
      name?: string
      budget?: number
      endDate?: string | null
      destinationUrl?: string
      platforms?: CampaignPlatform[]
    }) => {
      saveChain.current = saveChain.current
        .catch(() => undefined)
        .then(() => updateCampaign.mutateAsync({ campaignId: campaignId!, ...patch }))
        .then(() => undefined)
    },
    [campaignId, updateCampaign],
  )

  if (!campaign) {
    if (campaignQuery.isPending) return <Skeleton className="h-48 w-full" />
    return <p className="text-muted-foreground">Not found.</p>
  }

  return (
    <div className="space-y-10">
      <CampaignIdentity
        key={campaign.id}
        name={campaign.name}
        status={campaign.status}
        startDate={campaign.startDate}
        endDate={campaign.endDate ?? null}
        budget={campaign.budget}
        platforms={campaign.platforms}
        onSave={save}
      />

      <CampaignPerformanceSummary performance={performanceQuery.data?.data} />

      <CampaignAds
        ads={ads}
        library={library}
        attaching={updateCampaign.isPending}
        activating={updateAdUnit.isPending}
        onAttach={attach}
        onActivate={activate}
        pushReady={pushReady}
        pushingId={push.variables ?? null}
        onPush={(deploymentId) => push.mutate(deploymentId)}
      />

      <CampaignDestination
        key={`${campaign.id}-destination`}
        destinationUrl={campaign.destinationUrl ?? null}
        landingPages={landingPages.flatMap((page) =>
          page.hostedUrl ? [{ id: page.id, name: page.name, hostedUrl: page.hostedUrl }] : [],
        )}
        onSave={(destinationUrl) => save({ destinationUrl })}
      />

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
