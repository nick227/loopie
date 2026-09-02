import { db, resolveVisitorSid, normalizeLegacyPageContent } from '@project/db'
import { landingPageSubmitUrl, PUBLIC_SERVER_URL } from '../lib/urls'
import { renderLandingPageHtml } from '@project/page-renderer'
import { snapshotSlots, type AdSlotSnapshotItem } from '../lib/adSlots'
import { snapshotForm, isFormLive, type FormSnapshot } from '@project/page-renderer'
import { withResolvedMedia } from '../lib/pageMedia'
import { notifyKnownContactPageView } from '../lib/pageViewInbox'

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
    // Deliberately not awaited — this is the public hosted-page render, a hot path; resolving
    // "is this session a known contact" and posting an Inbox message must never add latency to a
    // real visitor's page load. The function has its own try/catch, so an unhandled rejection
    // here isn't possible.
    void notifyKnownContactPageView(page.businessId, visitor.sessionId, page.id, page.name)

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
          include: { assignments: true },
          orderBy: { sortOrder: 'asc' },
        }),
      )
    const content = await withResolvedMedia(
      page.businessId,
      normalizeLegacyPageContent(page.publishedVersion.content),
    )
    const templateSchema = page.publishedVersion.schemaSnapshot ?? page.template.schema
    // Real count, computed fresh on every request — no polling, no seeded/fake baseline. See the
    // webinar-widget's "seats filled" note in renderLandingPageSections.ts.
    const submissionCount = await db.formSubmission.count({ where: { landingPageId: page.id } })
    return {
      sidToken: visitor.token,
      html: renderLandingPageHtml({
        pageName: page.name,
        templateSchema: templateSchema as Parameters<
          typeof renderLandingPageHtml
        >[0]['templateSchema'],
        content,
        theme: page.publishedVersion.theme as any,
        layoutConfig: page.publishedVersion.layoutConfig as any,
        form,
        submitActionUrl: landingPageSubmitUrl(page.id),
        sessionToken: visitor.token,
        publishedVersionId: page.publishedVersion.id,
        adSlots,
        runtimeScriptUrl: `${PUBLIC_SERVER_URL}/loopie.js`,
        businessId: page.businessId,
        submissionCount,
      }),
    }
  }
}
