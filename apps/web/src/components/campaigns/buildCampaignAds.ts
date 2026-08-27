import type { CampaignAd, CampaignAdStatus } from '@/components/campaigns/CampaignAdCard'

const FORMAT_LABEL: Record<string, string> = {
  DISPLAY_BANNER: 'Display banner',
  NATIVE: 'Native',
  EMBED: 'Embed',
}

const CHANNELS: { id: string; label: string }[] = [
  { id: 'META', label: 'Meta' },
  { id: 'GOOGLE', label: 'Google' },
  { id: 'TIKTOK', label: 'TikTok' },
  { id: 'LOOPIE', label: 'LOOPIE' },
]

export const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  CHANNELS.map((row) => [row.id, row.label]),
)

type Unit = {
  id: string
  creativeId: string
  status: string
  impressions: number
  clicks: number
  format: string
  serveUrl?: string
}

type Deployment = {
  id: string
  creativeId: string
  platform: string
  status: string
  impressions: number
  clicks: number
  externalAdId?: string | null
  externalCampaignId?: string | null
  externalAdSetId?: string | null
}

type Placement = {
  platform: string
  status: string
  impressions: number
  clicks: number
  adUnitId?: string
  format?: string
  serveUrl?: string
  deploymentId?: string
  externalAdId?: string | null
  externalCampaignId?: string | null
  externalAdSetId?: string | null
}

export function summarizePlacementStatus(
  placements: { platform: string; status: string }[],
): CampaignAdStatus {
  if (placements.some((row) => row.status === 'ACTIVE')) return 'ACTIVE'
  if (placements.some((row) => row.platform === 'LOOPIE' && row.status === 'DRAFT')) return 'DRAFT'
  if (placements.some((row) => row.status === 'PAUSED')) return 'PAUSED'
  return 'INACTIVE'
}

export function buildCampaignAds(
  units: Unit[],
  deployments: Deployment[],
  creativeName: Map<string, string>,
  attachedIds: string[] = [],
): CampaignAd[] {
  const groups = new Map<string, Placement[]>()

  function add(creativeId: string, placement: Placement) {
    const rows = groups.get(creativeId) ?? []
    rows.push(placement)
    groups.set(creativeId, rows)
  }

  for (const unit of units) {
    add(unit.creativeId, {
      platform: 'LOOPIE',
      status: unit.status,
      impressions: unit.impressions,
      clicks: unit.clicks,
      adUnitId: unit.id,
      format: unit.format,
      serveUrl: unit.serveUrl,
    })
  }
  for (const row of deployments) {
    add(row.creativeId, {
      platform: row.platform,
      status: row.status,
      impressions: row.impressions,
      clicks: row.clicks,
      deploymentId: row.id,
      externalAdId: row.externalAdId,
      externalCampaignId: row.externalCampaignId,
      externalAdSetId: row.externalAdSetId,
    })
  }
  for (const id of attachedIds) {
    if (!groups.has(id)) groups.set(id, [])
  }

  return [...groups.entries()].map(([creativeId, placements]) => {
    const loopieDraft = placements.find(
      (row) => row.platform === 'LOOPIE' && row.status === 'DRAFT',
    )
    const loopie = placements.find((row) => row.platform === 'LOOPIE')
    return {
      id: creativeId,
      creativeName: creativeName.get(creativeId) ?? creativeId,
      channels: CHANNELS.filter((channel) =>
        placements.some((row) => row.platform === channel.id),
      ).map((channel) => channel.label),
      status: summarizePlacementStatus(placements),
      impressions: placements.reduce((sum, row) => sum + row.impressions, 0),
      clicks: placements.reduce((sum, row) => sum + row.clicks, 0),
      formatLabel: loopie?.format ? FORMAT_LABEL[loopie.format] : undefined,
      serveUrl: loopie?.serveUrl,
      canActivate: !!loopieDraft,
      activateId: loopieDraft?.adUnitId,
      draftPushes: placements
        .filter((row) => row.deploymentId)
        .map((row) => ({
          deploymentId: row.deploymentId!,
          platform: row.platform,
          externalAdId: row.externalAdId ?? null,
          externalCampaignId: row.externalCampaignId ?? null,
          externalAdSetId: row.externalAdSetId ?? null,
        })),
    }
  })
}
