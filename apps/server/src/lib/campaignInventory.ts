import type { Prisma } from '@prisma/client'

type ExternalPlatform = 'META' | 'GOOGLE' | 'TIKTOK'

function isExternalPlatform(platform: string): platform is ExternalPlatform {
  return platform === 'META' || platform === 'GOOGLE' || platform === 'TIKTOK'
}

export function splitPlatforms(platforms: string[]): { external: ExternalPlatform[]; loopie: boolean } {
  return {
    external: platforms.filter(isExternalPlatform),
    loopie: platforms.includes('LOOPIE'),
  }
}

export async function createCampaignInventory(
  tx: Prisma.TransactionClient,
  args: {
    businessId: string
    campaignId: string
    platforms: string[]
    creativeIds: string[]
    destinationUrl: string | null
  },
) {
  const { external, loopie } = splitPlatforms(args.platforms)
  if (external.length && args.creativeIds.length) {
    await tx.deployment.createMany({
      data: external.flatMap((platform) =>
        args.creativeIds.map((creativeId) => ({ campaignId: args.campaignId, creativeId, platform })),
      ),
    })
  }
  if (loopie && args.creativeIds.length) {
    await tx.adUnit.createMany({
      data: args.creativeIds.map((creativeId) => ({
        businessId: args.businessId,
        campaignId: args.campaignId,
        creativeId,
        format: 'DISPLAY_BANNER',
        status: 'DRAFT',
        destinationUrl: args.destinationUrl,
      })),
    })
  }
}
