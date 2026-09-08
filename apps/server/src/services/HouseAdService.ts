import { db } from '@project/db'
import { randomUUID } from 'crypto'

export class HouseAdService {
  async list(_params: any) {
    const data = await db.houseAd.findMany({
      include: {
        placements: true,
        advertisement: {
          select: {
            id: true,
            name: true,
            businessId: true,
            primaryText: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return data
  }

  async searchAdvertisements(query: string) {
    const data = await db.advertisement.findMany({
      where: {
        OR: [{ name: { contains: query } }, { business: { name: { contains: query } } }],
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        businessId: true,
        primaryText: true,
        business: { select: { id: true, name: true } },
      },
      take: 20,
    })
    return data
  }

  async create(data: any) {
    const ad = await db.houseAd.create({
      data: {
        name: data.name,
        type: data.type,
        scriptUrl: data.scriptUrl,
        imageUrl: data.imageUrl,
        targetUrl: data.targetUrl,
        advertisementId: data.advertisementId || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        weight: data.weight ?? 1, // `??`, not `||` — an explicit weight of 0 must be honored as 0
        status: data.status,
        placements: {
          create: data.placements?.map((p: any) => ({ zone: p.zone })) || [],
        },
      },
      include: { placements: true },
    })
    return ad
  }

  async update(houseAdId: string, data: any) {
    const updateData: any = {
      name: data.name,
      type: data.type,
      scriptUrl: data.scriptUrl,
      imageUrl: data.imageUrl,
      targetUrl: data.targetUrl,
      advertisementId: data.advertisementId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      weight: data.weight,
      status: data.status,
    }

    if (data.placements) {
      updateData.placements = {
        deleteMany: {},
        create: data.placements.map((p: any) => ({ zone: p.zone })),
      }
    }

    const ad = await db.houseAd.update({
      where: { id: houseAdId },
      data: updateData,
      include: { placements: true },
    })
    return ad
  }

  async delete(houseAdId: string) {
    await db.houseAd.delete({ where: { id: houseAdId } })
  }

  async serveAd(zone: string) {
    const placements = await db.houseAdPlacement.findMany({
      where: {
        zone: zone as any,
        houseAd: {
          status: 'ACTIVE',
        },
      },
      include: {
        houseAd: {
          include: {
            placements: true,
            advertisement: {
              include: {
                business: { select: { id: true, name: true } },
                assets: { include: { asset: true } },
              },
            },
          },
        },
      },
    })

    const activeAds = placements
      .map((p: any) => p.houseAd)
      .filter((ad: any) => {
        const now = new Date()
        if (ad.startDate && ad.startDate > now) return false
        if (ad.endDate && ad.endDate < now) return false
        return true
      })

    if (!activeAds.length) return null

    // `?? 1`, not `|| 1` — weight is a non-null Int column, so this only ever guards a genuinely
    // missing value, never an explicit weight of 0 (a real admin use case: temporarily zero out an
    // ad's serving frequency without pausing or deleting it). `|| 1` silently overrode 0 to 1.
    const totalWeight = activeAds.reduce((sum: number, ad: any) => sum + (ad.weight ?? 1), 0)
    let rand = Math.random() * totalWeight
    let chosenAd = activeAds[0]
    for (const ad of activeAds) {
      rand -= ad.weight ?? 1
      if (rand <= 0) {
        chosenAd = ad
        break
      }
    }

    // Auto-map native advertisement fields to the HouseAd fallback fields so the frontend
    // doesn't need a complex native AdRenderer just for House Ads.
    if (chosenAd?.advertisement) {
      if (!chosenAd.targetUrl && chosenAd.advertisement.destinationUrl) {
        chosenAd.targetUrl = chosenAd.advertisement.destinationUrl
      }
      if (!chosenAd.imageUrl && chosenAd.advertisement.assets?.[0]?.asset?.url) {
        chosenAd.imageUrl = chosenAd.advertisement.assets[0].asset.url
      }
    }

    return chosenAd
  }

  async trackMetric(houseAdId: string, zone: string, type: 'view' | 'click') {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)

    // MySQL handles date formatting natively, but Prisma raw queries sometimes require formatted strings.
    // Using ON DUPLICATE KEY UPDATE for atomic increments.
    const uuid = randomUUID()

    if (type === 'view') {
      await db.$executeRaw`
        INSERT INTO HouseAdMetric (id, houseAdId, zone, impressions, date)
        VALUES (${uuid}, ${houseAdId}, ${zone}, 1, ${date})
        ON DUPLICATE KEY UPDATE impressions = impressions + 1
      `
    } else {
      await db.$executeRaw`
        INSERT INTO HouseAdMetric (id, houseAdId, zone, clicks, date)
        VALUES (${uuid}, ${houseAdId}, ${zone}, 1, ${date})
        ON DUPLICATE KEY UPDATE clicks = clicks + 1
      `
    }
  }
}
