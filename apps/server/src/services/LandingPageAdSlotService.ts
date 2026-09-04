import { db } from '@project/db'
import { MAX_AD_SLOTS, asPlacement, asContext, toSlotDTO, type AdSlotInput } from '../lib/adSlots'
import { LandingPageService } from './LandingPageService'

const pages = new LandingPageService()

export class LandingPageAdSlotService {
  async replace(businessId: string, landingPageId: string, slots: AdSlotInput[]) {
    if (slots.length > MAX_AD_SLOTS) {
      throw { statusCode: 400, message: `A page can have at most ${MAX_AD_SLOTS} ad spaces` }
    }
    await pages.get(businessId, landingPageId)

    const adRunIds = slots.flatMap((s) => s.adRunIds || [])
    if (adRunIds.length) {
      // Validate that all adRunIds exist and belong to the business's advertisements
      const found = await db.adRun.findMany({
        where: { id: { in: adRunIds }, advertisement: { businessId } },
        select: { id: true },
      })
      if (found.length !== new Set(adRunIds).size) {
        throw { statusCode: 404, message: 'Ad run not found or unauthorized' }
      }
    }

    const advertisementIds = slots.flatMap((s) => s.advertisementIds || [])
    if (advertisementIds.length) {
      const found = await db.advertisement.findMany({
        where: { id: { in: advertisementIds }, businessId, deletedAt: null },
        select: { id: true },
      })
      if (found.length !== new Set(advertisementIds).size) {
        throw { statusCode: 404, message: 'Advertisement not found or unauthorized' }
      }
    }

    await db.$transaction(async (tx) => {
      // Cascade delete on relations handles assignments automatically, but we can be explicit
      await tx.landingPageAdSlot.deleteMany({ where: { landingPageId } })

      for (const [sortOrder, slot] of slots.entries()) {
        const createdSlot = await tx.landingPageAdSlot.create({
          data: {
            landingPageId,
            sortOrder,
            placement: asPlacement(slot.placement),
            context: asContext(slot.context ?? 'CONTAINED'),
          },
        })

        const assignments = [
          ...(slot.adRunIds ?? []).map((adRunId) => ({
            slotId: createdSlot.id,
            adRunId,
            advertisementId: null,
            weight: 1,
          })),
          ...(slot.advertisementIds ?? []).map((advertisementId) => ({
            slotId: createdSlot.id,
            adRunId: null,
            advertisementId,
            weight: 1,
          })),
        ]
        if (assignments.length) {
          await tx.landingPageAdSlotAssignment.createMany({ data: assignments })
        }
      }
    })

    return pages.get(businessId, landingPageId)
  }
}
