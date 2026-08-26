import { db } from '@project/db'
import { afterEach } from 'vitest'

// Clean between tests — order matters for FK constraints (children before parents).
// LandingPage <-> PublishedPageVersion is a genuine cycle (each has a FK to the other), so
// LandingPage.publishedVersionId is nulled out before PublishedPageVersion rows are deleted.
afterEach(async () => {
  await db.automationLog.deleteMany()
  await db.formSubmission.deleteMany()
  await db.pageView.deleteMany()
  await db.attributionEvent.deleteMany()
  await db.interaction.deleteMany()
  await db.sale.deleteMany()
  await db.lead.deleteMany()
  await db.formField.deleteMany()

  await db.landingPage.updateMany({ data: { publishedVersionId: null } })
  await db.publishedPageVersion.deleteMany()
  await db.deployment.deleteMany()
  await db.adUnit.deleteMany()
  await db.landingPage.deleteMany()

  await db.message.deleteMany()
  await db.automation.deleteMany()
  await db.form.deleteMany()
  await db.campaignCreative.deleteMany()
  await db.campaign.deleteMany()
  await db.creativeAsset.deleteMany()
  await db.creative.deleteMany()
  await db.templateMedia.deleteMany()
  await db.template.deleteMany()
  await db.audienceMember.deleteMany()
  await db.audience.deleteMany()
  await db.asset.deleteMany()
  await db.landingPageTemplate.deleteMany()
  await db.contact.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
  await db.business.deleteMany()
})
