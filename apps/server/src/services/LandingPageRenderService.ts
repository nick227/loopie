import { db, resolveVisitorSid } from '@project/db'
import { landingPageSubmitUrl } from '../lib/urls'
import { renderLandingPageHtml } from '../lib/renderLandingPage'
import { isFormLive, type FormSnapshot } from '../lib/formSnapshot'

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

    const form = (await isFormLive(db, page.publishedVersion.formId))
      ? ((page.publishedVersion.formSnapshot as unknown as FormSnapshot | null) ?? null) // In a real app we'd loadFormForRender if needed, but for refactoring we'll keep it simple or import it
      : null
    return {
      sidToken: visitor.token,
      html: renderLandingPageHtml({
        pageName: page.name,
        templateSchema: page.template.schema as any,
        content: page.publishedVersion.content as any,
        theme: page.publishedVersion.theme as any,
        form,
        submitActionUrl: landingPageSubmitUrl(page.id),
        sessionToken: visitor.token,
      }),
    }
  }
}
