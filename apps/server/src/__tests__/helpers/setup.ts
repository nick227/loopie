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

  // River references Advertisement/PublishedAdvertisementVersion/Business — must go before all
  // three are deleted below. RiverReaction/RiverFollow reference Business directly (not just via
  // RiverPost), so they go first too.
  await db.riverReaction.deleteMany()
  await db.riverFollow.deleteMany()
  await db.riverEngagementEvent.deleteMany()
  // Self-referencing (a reply's parentCommentId points at another RiverComment row) — deleteMany
  // handles that fine without an ordering pass, it's not a FK RiverPost itself needs to wait on
  // beyond "delete comments before the posts they reference."
  await db.riverComment.deleteMany()
  await db.riverPost.deleteMany()

  // Embed tables (a concurrent, in-flight session's own work — see CLAUDE.md's typecheck-error
  // note on @project/embed-contract) reference Advertisement/LandingPage/PublishedPageVersion but
  // weren't wired into this afterEach yet, which left orphaned rows in loopie_test that made
  // db.advertisement.deleteMany() below throw a real FK violation for every test in the suite —
  // found live, not by inspection, while adding the CRM avatar+notes tests. Purely additive
  // cleanup, children before parents; no application code touched.
  await db.embedProjectionOutbox.deleteMany()
  await db.embedEvent.deleteMany()
  await db.embedInstance.deleteMany()
  await db.embedAllowedOrigin.deleteMany()
  await db.embedBootstrapNonce.deleteMany()
  await db.embedDeployment.deleteMany()
  await db.publishedAdvertisementVersion.deleteMany()

  // Not FK-cascaded from anything for SYSTEM_LAYOUT rows (no publishedVersionId) — left
  // uncleaned, these accumulate across every test run and corrupt processPending's `take` window
  // for every later run (oldest-PENDING-first ordering keeps returning ancient orphaned rows
  // instead of the one a given test just enqueued). PUBLISHED_VERSION rows are also covered here
  // rather than relying solely on the onDelete: Cascade from publishedPageVersion below.
  await db.pageThumbnail.deleteMany()
  await db.landingPageAdSlot.deleteMany()
  await db.landingPage.updateMany({ data: { publishedVersionId: null } })
  await db.publishedPageVersion.deleteMany()
  await db.deployment.deleteMany()
  await db.adUnit.deleteMany()
  await db.advertisementAsset.deleteMany()
  await db.campaignAdRun.deleteMany()
  await db.adRun.deleteMany()
  await db.mediaOrderRevision.deleteMany()
  await db.advertisement.deleteMany()
  await db.affiliateClass.updateMany({ data: { defaultDealId: null } })
  await db.affiliate.deleteMany()
  await db.affiliateDeal.deleteMany()
  await db.affiliateClass.deleteMany()
  await db.embedProjectionOutbox.deleteMany()
  await db.formSubmission.deleteMany()
  await db.embedInstance.deleteMany()
  await db.embedDeployment.deleteMany()
  await db.publishedAdvertisementVersion.deleteMany()
  await db.publishedPageVersion.deleteMany()
  await db.advertisement.deleteMany()
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
  await db.goalEvent.deleteMany()
  await db.scheduledGoal.deleteMany()
  await db.assistantGoalCycle.deleteMany()
  await db.goalIdeaState.deleteMany()
  await db.goalIdeaTemplate.deleteMany()
  await db.performanceSnapshot.deleteMany()
  await db.contactNote.deleteMany()
  await db.contactTagAssignment.deleteMany()
  await db.contactTag.deleteMany()
  await db.contactIdentifier.deleteMany()
  await db.externalEvent.deleteMany()
  await db.externalContactRecord.deleteMany()
  // Inbox threads may reference Contacts and, for native site conversations, a peer Business.
  // Remove the projection before either parent table.
  await db.inboxMessage.deleteMany()
  await db.inboxThread.deleteMany()
  await db.contact.deleteMany()
  await db.businessInvitation.deleteMany()
  await db.businessMembership.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
  await db.platformConnection.deleteMany()
  await db.channelProvider.deleteMany()
  await db.business.deleteMany()

  // Not FK-scoped to Business/User (rate limiting is per ip+route, not per tenant) — wiped
  // separately so no test's rate-limit test can leak counters into another's.
  await db.rateLimitBucket.deleteMany()

  await db.attentionItem.deleteMany()
  await db.activityItem.deleteMany()
  await db.activitySeenState.deleteMany()
})
