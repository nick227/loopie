import type { Prisma } from '@prisma/client'

type ExternalPlatform = 'META' | 'GOOGLE' | 'TIKTOK'

function isExternalPlatform(platform: string): platform is ExternalPlatform {
  return platform === 'META' || platform === 'GOOGLE' || platform === 'TIKTOK'
}

export function splitPlatforms(platforms: string[]): {
  external: ExternalPlatform[]
  loopie: boolean
} {
  return {
    external: platforms.filter(isExternalPlatform),
    loopie: platforms.includes('LOOPIE'),
  }
}

// Deterministically brings live Deployment/AdUnit inventory in line with a campaign's current
// platforms x creativeIds. Called against a brand-new campaign (create/duplicate — no existing
// rows, so every desired combo is simply created) and against an edited one (update — the real
// diff: combos that dropped out of the desired set get retired, combos newly in it get created
// or revived). Never hard-deletes a row: Deployment/AdUnit are referenced by Lead/Sale/
// Interaction/AttributionEvent attribution history, so "no longer desired" always means
// status: ENDED, never a delete — the one thing this function must never do is leave a row that
// is no longer in the desired combo set sitting at a non-ENDED status ("stale live inventory").
async function reconcileModelInventory<T extends { id: string; status: string }>(
  tx: any,
  modelName: 'deployment' | 'adUnit',
  existingRows: T[],
  getKey: (row: T) => string,
  desiredSet: Map<string, any>,
  createPayload: (desired: any) => any,
  reviveStatus: string,
) {
  const groups = new Map<string, T[]>()
  for (const row of existingRows) {
    const key = getKey(row)
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }

  const idsToRetire: string[] = []
  for (const [key, rows] of groups) {
    if (desiredSet.has(key)) continue
    for (const row of rows) {
      if (row.status !== 'ENDED') idsToRetire.push(row.id)
    }
  }
  if (idsToRetire.length) {
    await tx[modelName].updateMany({
      where: { id: { in: idsToRetire } },
      data: { status: 'ENDED' },
    })
  }

  const toCreate: any[] = []
  for (const [key, desired] of desiredSet) {
    const rows = groups.get(key) ?? []
    if (rows.some((row) => row.status !== 'ENDED')) continue
    const revivable = rows.find((row) => row.status === 'ENDED')
    if (revivable) {
      await tx[modelName].update({ where: { id: revivable.id }, data: { status: reviveStatus } })
    } else {
      toCreate.push(createPayload(desired))
    }
  }
  if (toCreate.length) {
    await tx[modelName].createMany({ data: toCreate })
  }
}

export async function reconcileCampaignInventory(
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

  // ---- Deployments (external ad platforms) ----
  const existingDeployments = await (tx.deployment as any).findMany({
    where: { campaignId: args.campaignId },
    select: { id: true, platform: true, creativeId: true, status: true },
  })
  const desiredDeployments = new Map<string, { platform: ExternalPlatform; creativeId: string }>()
  for (const platform of external) {
    for (const creativeId of args.creativeIds) {
      desiredDeployments.set(`${platform}::${creativeId}`, { platform, creativeId })
    }
  }
  await reconcileModelInventory(
    tx,
    'deployment',
    existingDeployments,
    (row: any) => `${row.platform}::${row.creativeId}`,
    desiredDeployments,
    (desired) => ({
      campaignId: args.campaignId,
      creativeId: desired.creativeId,
      platform: desired.platform,
    }),
    'PENDING',
  )

  // ---- AdUnits (first-party LOOPIE inventory) ----
  const existingAdUnits = await (tx.adUnit as any).findMany({
    where: { campaignId: args.campaignId },
    select: { id: true, creativeId: true, status: true },
  })
  const desiredAdUnits = new Map<string, { creativeId: string }>()
  if (loopie) {
    for (const creativeId of args.creativeIds) desiredAdUnits.set(creativeId, { creativeId })
  }
  await reconcileModelInventory(
    tx,
    'adUnit',
    existingAdUnits,
    (row: any) => row.creativeId,
    desiredAdUnits,
    (desired) => ({
      businessId: args.businessId,
      campaignId: args.campaignId,
      creativeId: desired.creativeId,
      format: 'DISPLAY_BANNER',
      status: 'DRAFT',
      destinationUrl: args.destinationUrl,
    }),
    'DRAFT',
  )
}
