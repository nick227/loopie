import type { CampaignAd } from '@/components/campaigns/CampaignAdRow'

const FORMAT_LABEL: Record<string, string> = {
  DISPLAY_BANNER: 'Display banner',
  NATIVE: 'Native',
  EMBED: 'Embed',
}

export const PLATFORM_LABEL: Record<string, string> = {
  META: 'Meta',
  GOOGLE: 'Google',
  TIKTOK: 'TikTok',
  LOOPIE: 'LOOPIE',
}

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
}

export function buildCampaignAds(
  units: Unit[],
  deployments: Deployment[],
  creativeName: Map<string, string>,
): CampaignAd[] {
  return [
    ...units.map((unit) => ({
      id: unit.id,
      platform: 'LOOPIE',
      creativeName: creativeName.get(unit.creativeId) ?? unit.creativeId,
      status: unit.status,
      impressions: unit.impressions,
      clicks: unit.clicks,
      formatLabel: FORMAT_LABEL[unit.format] ?? unit.format,
      serveUrl: unit.serveUrl,
      canActivate: unit.status === 'DRAFT',
    })),
    ...deployments.map((row) => ({
      id: row.id,
      platform: PLATFORM_LABEL[row.platform] ?? row.platform,
      creativeName: creativeName.get(row.creativeId) ?? row.creativeId,
      status: row.status,
      impressions: row.impressions,
      clicks: row.clicks,
      canActivate: false,
    })),
  ]
}
