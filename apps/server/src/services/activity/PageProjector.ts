import { ActivitySourceKind, ActivityAttentionState } from '@prisma/client'
import { BaseProjector, ProjectionData } from './BaseProjector'

export class PageProjector {
  static async project(page: any) {
    // Page published -> informational
    if (page.status !== 'PUBLISHED') return

    const data: ProjectionData = {
      businessId: page.businessId,
      sourceKind: ActivitySourceKind.LOOPIE,
      sourceRecordType: 'LandingPage',
      sourceRecordId: page.id,
      // Since a page can be published multiple times, a real implementation might use a LandingPageVersion
      // For now we'll just track the latest publish event or treat it as a single event per page ID.
      eventKey: 'PAGE_PUBLISHED',

      taxonomyVersion: 'v1',
      type: 'PAGE_PUBLISHED',

      occurredAt: page.updatedAt,
      observedAt: page.updatedAt,
      storyId: `page-${page.id}`,

      sourceLabel: 'Landing Pages',

      actorKind: 'USER',
      actorLabel: 'System', // We might not have the user who published it readily available on the page model

      status: page.status,
      attention: ActivityAttentionState.INFORMATION,
      summary: `Landing Page published: ${page.name}`,

      pageId: page.id,
    }

    await BaseProjector.upsertActivity(data)
  }
}
