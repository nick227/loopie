import { InboxProjectionService } from '../services/InboxProjectionService'

// Same platform vocabulary the AdRun monitoring contract uses (see
// docs/architecture/01-external-ad-monitoring-contract.md), but "Meta" not "Facebook" — this is a
// plain-language Inbox sentence ("via Summer Meta Ad"), not the runLabel() used for
// dashboard/placement grouping in advertisementSummary.ts, which deliberately says "Facebook."
const AD_PLATFORM_LABEL: Record<string, string> = {
  META: 'Meta',
  GOOGLE: 'Google',
  TIKTOK: 'TikTok',
}

// Contextual projection, not duplication (2026-08-28's product direction): one real form
// submission is one canonical event, posted into two threads because it means something different
// in each context — "Marcus Hill submitted Consultation Request" in his own conversation history,
// "New submission from Marcus Hill" in the page's own history of what's landed on it. Both reads
// are true at once; this is not the same failure mode as duplicating a Message into a second
// InboxMessage row (see InboxService's own doc comment on why real communications are read live,
// never copied) — a submission has no other canonical record for either thread to diverge from,
// each projection is just a different sentence describing the same FormSubmission row.
//
// Ad attribution (2026-08-29): when the click that produced this lead was traced to a specific
// AdRun (see docs/architecture/02-navigation-stack-scoping.md's "attribution-copy gap"), both
// projections gain a second line naming it — the data (Lead.sourceAdRunId) already existed, the
// Inbox sentence just didn't surface it before. `leadCreated` reuses the same signal
// LandingPageSubmissionService.submit() already computes to decide whether to bump
// deployment/adRun/adUnit conversions — a genuinely new Lead reads "New lead from {page}", a
// repeat submission against an already-open Lead keeps the original "Submitted {form}" phrasing.
export async function notifyFormSubmission(
  businessId: string,
  contact: { id: string; name: string },
  page: { id: string; name: string },
  formName: string,
  options?: {
    leadCreated?: boolean
    adAttribution?: { name: string; platform: string } | null
  },
) {
  const leadCreated = options?.leadCreated ?? false
  const adAttribution = options?.adAttribution ?? null
  const attributionLine = adAttribution
    ? `via ${adAttribution.name} ${AD_PLATFORM_LABEL[adAttribution.platform] ?? adAttribution.platform} Ad`
    : null

  try {
    const contactBody = leadCreated
      ? [`New lead from ${page.name}.`, attributionLine].filter(Boolean).join('\n')
      : [`Submitted ${formName}.`, attributionLine].filter(Boolean).join('\n')
    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'CONTACT', contactId: contact.id },
      threadSubject: contact.name,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: leadCreated ? 'New lead' : 'Form submitted',
      body: contactBody,
      meta: { landingPageId: page.id, formName, adRunName: adAttribution?.name ?? null },
    })
  } catch (err) {
    console.error('Failed to post Inbox message (contact) for form submission', err)
  }

  try {
    const pageBody = [`New submission from ${contact.name}.`, attributionLine]
      .filter(Boolean)
      .join('\n')
    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'PAGE', landingPageId: page.id },
      threadSubject: page.name,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: 'New submission',
      body: pageBody,
      meta: { contactId: contact.id, formName, adRunName: adAttribution?.name ?? null },
    })
  } catch (err) {
    console.error('Failed to post Inbox message (page) for form submission', err)
  }
}
