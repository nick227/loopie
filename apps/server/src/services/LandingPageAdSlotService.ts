import { db } from '@project/db'
import { MAX_AD_SLOTS, asPlacement, toSlotDTO, type AdSlotInput } from '../lib/adSlots'
import { LandingPageService } from './LandingPageService'

const pages = new LandingPageService()

export class LandingPageAdSlotService {
  async replace(businessId: string, landingPageId: string, slots: AdSlotInput[]) {
    if (slots.length > MAX_AD_SLOTS) {
      throw { statusCode: 400, message: `A page can have at most ${MAX_AD_SLOTS} ad spaces` }
    }
    await pages.get(businessId, landingPageId)
    const adUnitIds = slots.map((slot) => slot.adUnitId).filter((id): id is string => Boolean(id))
    if (adUnitIds.length) {
      const found = await db.adUnit.findMany({
        where: { id: { in: adUnitIds }, businessId },
        select: { id: true },
      })
      if (found.length !== new Set(adUnitIds).size) {
        throw { statusCode: 404, message: 'Ad unit not found' }
      }
    }
    await db.$transaction(async (tx) => {
      await tx.landingPageAdSlot.deleteMany({ where: { landingPageId } })
      if (slots.length) {
        await tx.landingPageAdSlot.createMany({
          data: slots.map((slot, sortOrder) => ({
            landingPageId,
            sortOrder,
            placement: asPlacement(slot.placement),
            adUnitId: slot.adUnitId,
          })),
        })
      }
    })
    return pages.get(businessId, landingPageId)
  }
}
