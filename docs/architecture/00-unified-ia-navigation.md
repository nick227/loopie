# Unified IA & Navigation

## Purpose

Resolves the vocabulary and navigation conflict between the two packs: Messaging's design rules blacklist "Campaign" in UI copy (`09-design-system-interaction-rules.md`), while Campaigns treats it as the primary unit and top-level nav item (`07-ux-information-architecture.md`). This doc is the merged product's actual navigation — it depends on `00-unified-data-model.md` but adds nothing to it.

**Revision (2026-08-27):** This doc originally resolved the conflict by keeping "Campaign" as canonical domain terminology while making **Advertising** the top-level UI label, with Contacts and Results as their own top-level surfaces. That nav has been rebuilt to a leaner one: **Campaign returns as the literal top-level label**, and Contacts/Results are deliberately removed from the top nav — both reachable through the two acquisition surfaces instead of standing alone. Rationale below; superseded sections have been rewritten rather than left stale.

**Revision (2026-08-28) — superseded the 2026-08-27 nav.** This revision landed in application code (`Shell.tsx`, the `Advertisement`/`AdRun` model's frontend cutover) before it landed in this doc — this section brings the doc back in sync with what's actually built and confirms the direction going forward, rather than describing something new. See "Top-Level Navigation," "CRM Replaces Contacts-Under-Messages," and "Legacy, Orphaned-From-Nav Surfaces" below for the full picture; sections below that are still accurate from the prior revision (Media, Pages, the "not merged into one generic object" rule) are left as-is.

**Stale as of 2026-08-30 — not rewritten in this pass.** This whole doc predates both the 2026-08-29 "Inbox is the root" revision and its 2026-08-30 reversal back to a persistent top nav (`docs/strategy/03-product-principles.md`'s dated revision notes are the current source of truth for the actual IA — five peer tabs, Home/Pages/Advertising/Contacts/Messages, plus a shared `WelcomeSection` embedded on all five). Treat everything below as historical context for how the nav got here, not a current spec; a real rewrite of this doc is a follow-up, not done here.

**Revision (2026-08-28, later same day) — Inbox folded into Home.** Superseded the six-item nav above. The standalone `/inbox` list page is gone — its content (the same `UniversalRow` thread list, `compact` density) now renders directly on Home in place of the old "Live work" activity feed, via a new `components/home/InboxFeed.tsx`. `/inbox/:threadId` (thread detail) was **not** removed — clicking a thread from Home still opens it, its breadcrumb now points back to `/home` instead of a `/inbox` that no longer exists. Top-level nav drops to five items. This was a deliberate consolidation, not a deprecation — `InboxPage.tsx`, `InboxPreview.tsx`, and `OperatingFeed.tsx` (the thing Inbox replaced on Home) were all deleted outright, not left orphaned-on-disk the way the Legacy section below still treats `/campaigns` or `/activity` — there's no ambiguity to preserve here, Home is unambiguously the one place this content lives now.

**Revision (2026-08-28, later still) — information-hierarchy pass, then Media dropped from nav.** Two more changes, both after Inbox folded into Home: first, Home's old KPI strip (`BusinessSignalRail`) was deleted outright, not trimmed — replaced by real per-system stat cards (`OwnedSystemCard`) under a "Your business" section below the now-dominant Inbox feed; CRM's page also had a real information-hierarchy pass (state-driven rows, source chips into a filter dropdown, Import/Integrations demoted out of the page — see `docs/design/00-design-language-spec.md`'s "Information Hierarchy Pass" section for the full detail, not repeated here). Second, and separately: **Media dropped from top-level nav entirely** — down to four items. Not a deprecation the way `/campaigns`/`/activity` are — the `/media` route, `MediaPage.tsx`, and the underlying Asset library are all still the current, correct system, just deliberately not linked from nav for now. The stated reasoning: media is primarily consumed through the `MediaPicker` modal while composing an ad or message, not browsed as its own top-level destination — "that's okay for now" was the explicit call, not a judgment that the standalone library page is wrong or unfinished.

## Decision

**"Campaign" is no longer a top-level label.** The paid-advertising surface's canonical UI label is now **Advertisements** (`/ads`), and — a real, not just cosmetic, change — it is backed by the newer `Advertisement → AdRun` model (`useAdvertisements`), not the older `Campaign → Deployment/AdUnit` model. The `Campaign` model, its `/campaigns` routes, and everything nested under old Campaign detail (Budget/Creatives/Ad Units/Leads/Deployments-per-campaign) are **legacy**: still on disk, still functional, deliberately not deleted (same "deprecated = stop writing, never delete" policy the AdRun migration itself established — see CLAUDE.md's "Media/Advertisement/AdRun Migration" series), but no longer reachable from top-level nav. The underlying rule that motivated the original "Campaign" vs "Advertising" debate — paid acquisition and owned/organic messaging stay two mechanisms feeding one shared Contact/Lead/Sale/Interaction model, never merged into one generic object — is unchanged; what changed is which concrete model backs the paid side's UI.

A user saying "I want to text my customers" should still never have to understand that as "create an ad."

## Top-Level Navigation

```text
Home · CRM · Advertisements · Pages
```

ADMIN accounts get two more appended (`Affiliates`, `Billing`) — see `Shell.tsx`'s `ADMIN_NAV`. Affiliate logins keep their own separate shell: Home · Team · Payouts (`/portal`).

```text
Home
  Operational landing screen — "what needs me today." Its own unified activity/notification
  feed lives here now (see "Inbox folded into Home" above): contact conversations (email/text
  threads), Advertisements system notices (rejected, budget changed, review issue), Pages form
  submissions, integration alerts — one feed, replacing both the old standalone Inbox page and
  what the "Activity" page attempted in parallel (see "Legacy" below). Compose lives in that
  feed's own header, routed to the existing message-compose flow rather than a new one. Thread
  detail is still its own route (`/inbox/:threadId`), just not reached through a `/inbox` list
  anymore — only through Home.

CRM
  Contacts and pipeline — promoted to top-level, no longer nested under Messages. Currently
  wraps /contacts. Audiences, Automations, and Templates are NOT YET contextually surfaced
  inside CRM (open gap, see "Known Gaps" below) — they still exist as legacy routes.

Advertisements
  The canonical paid-media surface (/ads), backed by Advertisement → AdRun, not the legacy
  Campaign → Deployment model. What Campaign detail's Budget/Creatives/Ad Units/Leads/
  Performance sub-nav offered for the old model has no confirmed equivalent shape here yet —
  another open gap, not to be assumed equivalent without checking the actual AdRun pages.

Pages
  Unchanged from the prior revision — hosted landing pages, a first-class publishing surface
  with ad spaces. See "Pages Are a First-Class Publishing Surface" below.
```

Media is no longer top-level nav (see the revision note above) — still the same real system, reachable through the `MediaPicker` modal when composing an ad/message, and by direct URL at `/media`. See "Media Is a First-Class Shared Primitive" below for what still applies to the underlying system even without its own nav entry.

Sales stay reachable from a Contact's own detail view, unchanged from the prior revision.

## Legacy, Orphaned-From-Nav Surfaces

These are fully built, fully routed, and untouched on disk — just not linked from top-level nav or (yet) from any of the four surfaces above (five, counting Media, which is unlinked from nav but not "legacy" — see the revision note above). Reachable today only by direct URL or the few contextual links that already exist (Home's own Inbox feed still links `/messages/new` for Compose; Home's `OwnedSystemCard`s link `/ads`, `/landing-pages`, `/contacts`, `/media` — Home's old KPI strip, `BusinessSignalRail`, which used to link a few of these too, was deleted in the information-hierarchy pass above, not replaced link-for-link):

- **`/campaigns`** and everything under old Campaign detail — legacy, superseded by Advertisements (see Decision above). A concurrent, uncommitted edit had briefly relabeled `/campaigns`'s own page "Advertisements" and copied `/ads`'s list chrome onto it; that was reverted (2026-08-28) specifically because it manufactured a second surface competing for the same name on top of a different, legacy data model. Don't redo that without deciding to actually retire `/ads` in its favor instead.
- **`/messages`** (the list page) — Messages' own list/detail/send/performance pages are still there; only the top-level nav entry is gone. Compose is still reachable via Home's Inbox feed.
- **`/automations`, `/audiences`, `/templates`** — fully built, zero inbound links from anywhere in the app right now (verified: no other page links to any of the three). Automations' "Automations Must Be Source-Agnostic" rule below still applies whenever this gets folded back in somewhere.
- **`/leads`, `/sales`** — no contextual link anywhere anymore since `BusinessSignalRail`'s deletion; reachable only by direct URL or from a Contact's own detail view (a Sale is recorded against a contact, per the "Sales stay reachable from a Contact's own detail view" line above). **`/platforms`** — reachable via Advertisements-adjacent widgets; no standalone nav entry.
- **`/activity`** — a second, independently-built unified-activity-stream page (sidebar + filters + inspector panel), built in parallel with and superseded first by Inbox, then by Home's Inbox feed after Inbox itself was folded in. Left on disk, unlinked, pending a decision on whether any of its parts (the inspector panel, saved filter views) are worth folding into Home later. Its own `useActivityViews`/`ActivityStream` code currently fails typecheck independent of anything in this pass — a sign it was mid-build when superseded, not a finished alternative.

None of the above should be silently deleted, and none should be silently re-added to nav either — each needs a deliberate call, the same way Advertisements-over-Campaigns just got one.

## Known Gaps (2026-08-28)

- CRM doesn't yet contextually surface Audiences, Automations, or Templates (they're CRM-and-Messages-adjacent concepts with nowhere to live now that Messages isn't top-level). Worth a deliberate pass, not an assumption either way.
- Advertisements (`/ads` → `AdRun`) has no confirmed equivalent yet for what Campaign detail used to offer per-campaign (Budget ledger, scoped Creatives/Ad Units, scoped Leads, a Performance funnel). Check the actual AdRun-side pages before assuming parity — don't extrapolate from the legacy Campaign shape below.

## Home vs. Per-Surface Performance

No blended cross-channel "Results" or "Reports" surface exists anymore — that job is split:

- **Home** — operational, "what needs me today": new leads, unanswered replies, follow-ups due, failed sends, automation errors, pending approvals. Unchanged from the prior revision — this is the training pack's "Start of Day" checklist (`02-daily-account-operations.md`) made into the landing screen.
- **Campaigns → Performance** and **Messages → Performance** existed under the prior nav (spend/CPL/ROAS on the Campaigns side; sent/opened/reply-rate on the Messages side) but both surfaces are now legacy/orphaned-from-nav (see "Legacy, Orphaned-From-Nav Surfaces" above) — their Performance pages still exist and still work, just aren't reachable from a live nav path anymore. **Advertisements (`/ads`) has no confirmed Performance-equivalent page yet** — one of the open items in "Known Gaps" above, not something to assume exists just because Campaigns had one.

A cross-channel blended view (e.g. "total pipeline regardless of source") is a real capability the backend already supports (`GET /results` still exists and still computes it — see `apps/server/src/services/DashboardService.ts`) but is intentionally not promoted to a nav destination or given a page of its own labeled "Results"/"Reports." If a blended number earns a place in the product later, it belongs as a small, unnamed section on Home, not a third way of asking "what happened" alongside the other two.

## Media Is a First-Class Shared Primitive

Media (the Asset library) is reusable across Advertisements, Messages, Pages, and future surfaces, with its own lifecycle, metadata, and search. This reasoning is why Media originally earned a top-level nav item — **since superseded** (see the 2026-08-28 revision note above): Media dropped from top-level nav, on the explicit call that it's consumed almost entirely through the picker, not browsed as its own destination. The system underneath (the split below) is unchanged; only its nav placement is.

Split the interaction model:

- **Media page** (`/media`) — manage the shared library: search, type, upload, preview, usage, platform specs (aspect ratio / placement fit). Not a DAM — no folders, no DPI, no bulk production tools.
- **Media picker** — select existing media while composing an ad or message. Upload in the picker is allowed so work is not blocked; management (replace, delete, inspect usage) stays on the Media page.

Rule: if an object is reusable across multiple top-level domains and has its own lifecycle, management, and metadata, it can justify first-class navigation. Forms still do not — they are created inline on a landing page.

## Automations Must Be Source-Agnostic

**Still the rule, whenever Automations gets folded back into a live surface** (it's currently legacy/orphaned-from-nav — see above). Its trigger picker must expose **"New lead"** as a general trigger covering any `source_type` — not only "Message reply." If the only visible trigger is reply-based, an ad-sourced lead silently never gets a follow-up, which recreates the exact gap the unified data model was built to close. Reply-based triggers remain available as a separate, additional option, not a replacement.

## CRM Replaces Contacts-Under-Messages

Supersedes this section's 2026-08-27 version ("Contacts Lives Under Messages, Not Top-Level"), which itself had reversed an earlier "Contacts as top-level" stance. As of the 2026-08-28 nav, Contacts is reached through **CRM**, promoted back to a standalone top-level surface — not nested under Messages, which is itself now legacy/orphaned-from-nav. Contacts is still the shared spine every acquisition surface feeds into — that part has never been up for debate across any revision — only where you browse it from has moved. A Lead sourced from Advertisements is still the exact same Contact record and still shows up in CRM; nothing about a paid-sourced lead is harder to find than an organically-sourced one.

## Pages Are a First-Class Publishing Surface

Landing pages are reusable across ad runs (`LandingPage` has no owning `campaignId` or `adRunId`) **and** they are inventory: a page can hold many first-party `AdUnit` placements. That earns a top-level **Pages** nav item, same rule as Media.

An Advertisement/AdRun can still link a page as a click destination (mirroring what Campaign detail used to do, prior to the Advertisements migration). Managing pages, ad spaces, and publish lives on `/landing-pages`.

## Landing Pages and Creatives Are Reusable Libraries — Legacy Discovery Path, Not Yet Reconfirmed

Originally: both are genuinely reusable across many campaigns (`00-unified-data-model.md`'s Creative section; `LandingPage` has no owning `campaignId`), so **`Campaign detail → Landing Pages` and `Campaign detail → Creatives`** showed what's attached to _this_ campaign with a link out to the full library. That discovery path lived on Campaign detail, which is now legacy (see "Legacy, Orphaned-From-Nav Surfaces" above). **Whether Advertisement/AdRun detail offers an equivalent "attached to this run, link out to the library" pattern hasn't been confirmed** — one more item for "Known Gaps" above, not to be assumed carried over.

Ad Units kept the placement from the prior revision — nested in Campaign detail, scoped to one campaign the way a Deployment was. Same caveat: whether AdRun detail reproduces this scoping is unconfirmed.

## Explicitly Not Done

- Message and Campaign/Advertisement are not merged into a generic object ("Outreach," "Activity") anywhere in the UI. They share backend infrastructure only; workflows stay separate because they're genuinely different (recipients/scheduling/personalization vs. creatives/platforms/budget/run).
- "Results" and "Reports" are not used as navigation labels anywhere — see "Home vs. Per-Surface Performance" above.
- Forms still get no nav surface at all — a Form is selected or created inline while authoring a Landing Page, never browsed as its own section, unchanged from the prior revision.
- Two independently-built "unified activity" pages (`/activity` and the now-removed `/inbox`) were not merged into one implementation — Inbox was chosen as the survivor (and later folded into Home outright) while Activity was left alone on disk (see "Legacy" above), not reconciled line-by-line. If anything from Activity is worth keeping, that's a deliberate follow-up, not something inferred from this doc.
