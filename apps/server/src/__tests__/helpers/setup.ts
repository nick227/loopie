import './env'
import { db, assertTestDatabaseUrl } from '@project/db'
import { afterEach } from 'vitest'

// Hard safety net, not just a config default: this file's afterEach wipes EVERY table, so a
// misconfigured DATABASE_URL (TEST_DATABASE_URL unset somewhere new, a future vitest.config.ts
// refactor, an env file mistake) must fail loudly here rather than silently deleting real data —
// see CLAUDE.md's "Shared Database Policy" incident, discovered only after the fact.
assertTestDatabaseUrl(process.env.DATABASE_URL)

// Clean between tests — order matters for FK constraints (children before parents).
// LandingPage <-> PublishedPageVersion is a genuine cycle (each has a FK to the other), so
// LandingPage.publishedVersionId is nulled out before PublishedPageVersion rows are deleted.
afterEach(async () => {
  await db.payoutItem.deleteMany()
  await db.payout.deleteMany()
  await db.commission.deleteMany()
  await db.reconciliation.deleteMany()
  await db.adSpend.deleteMany()
  await db.refund.deleteMany()
  await db.payment.deleteMany()
  await db.budgetAuthorization.deleteMany()
  await db.ledgerEntry.deleteMany()
  await db.ledgerTransaction.deleteMany()
  await db.financialAccount.deleteMany()
  await db.automationRun.deleteMany()
  await db.automationLog.deleteMany()
  await db.saleAffiliateSplit.deleteMany()
  await db.affiliateReferralClick.deleteMany()
  await db.externalEvent.deleteMany()
  await db.contactIdentifier.deleteMany()
  await db.externalContactRecord.deleteMany()
  await db.importJob.deleteMany()
  await db.loopieSession.deleteMany()
  await db.integration.deleteMany()
  await db.formSubmission.deleteMany()
  await db.pageView.deleteMany()
  await db.attributionEvent.deleteMany()
  await db.interaction.deleteMany()
  await db.sale.deleteMany()
  await db.lead.deleteMany()
  await db.formField.deleteMany()

  await db.landingPageAdSlot.deleteMany()
  await db.landingPage.updateMany({ data: { publishedVersionId: null } })
  await db.publishedPageVersion.deleteMany()
  await db.deployment.deleteMany()
  await db.adUnit.deleteMany()
  await db.advertisementAsset.deleteMany()
  await db.campaignAdRun.deleteMany()
  await db.adRun.deleteMany()
  await db.advertisement.deleteMany()
  await db.affiliateClass.updateMany({ data: { defaultDealId: null } })
  await db.affiliate.deleteMany()
  await db.affiliateDeal.deleteMany()
  await db.affiliateClass.deleteMany()
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
  await db.performanceSnapshot.deleteMany()
  await db.contact.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
  await db.platformConnection.deleteMany()
  await db.business.deleteMany()

  // Not FK-scoped to Business/User (rate limiting is per ip+route, not per tenant) — wiped
  // separately so no test's rate-limit test can leak counters into another's.
  await db.rateLimitBucket.deleteMany()
})
