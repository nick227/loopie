import { db, resolveVisitorSid } from '@project/db'
import { landingPageSubmitUrl } from '../lib/urls'
import { renderLandingPageHtml } from '../lib/renderLandingPage'
import { snapshotSlots, type AdSlotSnapshotItem } from '../lib/adSlots'
import { snapshotForm, isFormLive, type FormSnapshot } from '../lib/formSnapshot'
import { withResolvedMedia } from '../lib/pageMedia'

export class LandingPageRenderService {
  async serve(
    slug: string,
    opts: {
      sessionId?: string
      referrer?: string
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
    },
  ) {
    const page = await db.landingPage.findUnique({
      where: { slug },
      include: { publishedVersion: true, template: true },
    })
    if (!page || page.deletedAt || page.status !== 'PUBLISHED' || !page.publishedVersion) {
      throw { statusCode: 404, message: 'Page not found' }
    }

    const visitor = resolveVisitorSid(opts.sessionId)
    await db.pageView.create({
      data: {
        landingPageId: page.id,
        publishedPageVersionId: page.publishedVersion.id,
        sessionId: visitor.sessionId,
        referrer: opts.referrer,
        utmSource: opts.utmSource,
        utmMedium: opts.utmMedium,
        utmCampaign: opts.utmCampaign,
      },
    })

    // Same fallback as LandingPageSubmissionService.submit: a PublishedPageVersion that predates
    // the formSnapshot column (or any future row where the snapshot write failed) must still
    // render its live form rather than silently rendering with no form at all.
    const form: FormSnapshot | null = (await isFormLive(db, page.publishedVersion.formId))
      ? ((page.publishedVersion.formSnapshot as unknown as FormSnapshot | null) ??
        (await snapshotForm(db, page.publishedVersion.formId)))
      : null
    const storedSlots = page.publishedVersion.adSlotSnapshot as AdSlotSnapshotItem[] | null
    const adSlots =
      storedSlots ??
      snapshotSlots(
        await db.landingPageAdSlot.findMany({
          where: { landingPageId: page.id },
          orderBy: { sortOrder: 'asc' },
        }),
      )
    const content = await withResolvedMedia(page.businessId, page.publishedVersion.content as never)
    return {
      sidToken: visitor.token,
      html: renderLandingPageHtml({
        pageName: page.name,
        templateSchema: page.template.schema as any,
        content,
        theme: page.publishedVersion.theme as any,
        form,
        submitActionUrl: landingPageSubmitUrl(page.id),
        sessionToken: visitor.token,
        adSlots,
      }),
    }
  }
}
