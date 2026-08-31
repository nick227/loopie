import type { PublishTarget } from '@/components/ads/AdDestinations'
import { toEndIso, toStartIso } from '@/lib/adOrder'

type CreatedRun = { data?: { id: string; status: string } }

export async function startAdRuns(
  advertisementId: string,
  targets: PublishTarget[],
  createRun: (input: {
    advertisementId: string
    platform: PublishTarget['platform']
    placement: string
    budget: number
    startDate?: string
    endDate?: string
    destinationLandingPageId?: string
    idempotencyKey: string
    orderSnapshot?: Record<string, unknown>
    supersedesRunId?: string
  }) => Promise<CreatedRun>,
  resumeRun: (input: { advertisementId: string; runId: string }) => Promise<unknown>,
) {
  for (const target of targets) {
    const result = await createRun({
      advertisementId,
      platform: target.platform,
      placement: target.placement,
      budget: target.budget,
      startDate: target.startDate ? toStartIso(target.startDate) : undefined,
      endDate: target.endDate ? toEndIso(target.endDate) : undefined,
      destinationLandingPageId: target.destinationLandingPageId,
      idempotencyKey: crypto.randomUUID(),
      orderSnapshot: target.orderSnapshot,
      supersedesRunId: target.supersedesRunId,
    })
    const run = result.data
    if (
      target.platform === 'LOOPIE' &&
      run &&
      (run.status === 'PENDING' || run.status === 'PAUSED')
    ) {
      await resumeRun({ advertisementId, runId: run.id })
    }
  }
}
