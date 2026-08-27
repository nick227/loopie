import type { PublishTarget } from '@/components/ads/AdDestinations'

type CreatedRun = { data?: { id: string; status: string } }

export async function startAdRuns(
  advertisementId: string,
  targets: PublishTarget[],
  createRun: (input: {
    advertisementId: string
    platform: PublishTarget['platform']
    placement: string
    budget: number
    destinationLandingPageId?: string
    idempotencyKey: string
  }) => Promise<CreatedRun>,
  resumeRun: (input: { advertisementId: string; runId: string }) => Promise<unknown>,
) {
  for (const target of targets) {
    const result = await createRun({
      advertisementId,
      platform: target.platform,
      placement: target.placement,
      budget: target.budget,
      destinationLandingPageId: target.destinationLandingPageId,
      idempotencyKey: crypto.randomUUID(),
    })
    const run = result.data
    if (run && (run.status === 'PENDING' || run.status === 'PAUSED')) {
      await resumeRun({ advertisementId, runId: run.id })
    }
  }
}
