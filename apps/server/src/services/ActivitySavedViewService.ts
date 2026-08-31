import { prisma } from '@project/db'

export class ActivitySavedViewService {
  async getSavedViews(businessId: string, userId: string) {
    const views = await prisma.activitySavedView.findMany({
      where: { businessId, userId },
      orderBy: { createdAt: 'desc' },
    })

    return views.map((v) => ({
      id: v.id,
      name: v.name,
      filters: v.filters as Record<string, any>,
      createdAt: v.createdAt.toISOString(),
    }))
  }

  async createSavedView(
    businessId: string,
    userId: string,
    name: string,
    filters: Record<string, any>,
  ) {
    const view = await prisma.activitySavedView.create({
      data: {
        businessId,
        userId,
        name,
        filters,
      },
    })

    return {
      id: view.id,
      name: view.name,
      filters: view.filters as Record<string, any>,
      createdAt: view.createdAt.toISOString(),
    }
  }

  async updateSavedView(viewId: string, businessId: string, userId: string, name: string) {
    const view = await prisma.activitySavedView.update({
      where: { id: viewId, businessId, userId },
      data: { name },
    })

    return {
      id: view.id,
      name: view.name,
      filters: view.filters as Record<string, any>,
      createdAt: view.createdAt.toISOString(),
    }
  }

  async deleteSavedView(viewId: string, businessId: string, userId: string) {
    await prisma.activitySavedView.delete({
      where: { id: viewId, businessId, userId },
    })
  }
}
