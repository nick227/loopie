# Unified IA & Navigation

## Purpose
Resolves the vocabulary and navigation conflict between the two packs: Messaging's design rules blacklist "Campaign" in UI copy (`09-design-system-interaction-rules.md`), while Campaigns treats it as the primary unit and top-level nav item (`07-ux-information-architecture.md`). This doc is the merged product's actual navigation — it depends on `00-unified-data-model.md` but adds nothing to it.

**Revision (2026-08-27):** This doc originally resolved the conflict by keeping "Campaign" as canonical domain terminology while making **Advertising** the top-level UI label, with Contacts and Results as their own top-level surfaces. That nav has been rebuilt to a leaner one: **Campaign returns as the literal top-level label**, and Contacts/Results are deliberately removed from the top nav — both reachable through the two acquisition surfaces instead of standing alone. Rationale below; superseded sections have been rewritten rather than left stale.

## Decision
**"Campaign" is the primary top-level label for the paid-advertising surface — not "Advertising."** It is still canonical domain terminology only for paid media (a Campaign is a paid-media run; a Message is an owned/organic send — see `00-unified-data-model.md`), so Messaging keeps its own Message/Automation vocabulary and "Campaign" never appears inside the Messages surface. What changed from the prior revision is narrower than it looks: the *label* moved back to "Campaign," but the underlying rule — Message and Campaign stay two acquisition mechanisms feeding one shared Contact/Lead/Sale/Interaction model, never merged into one generic object — is unchanged.

A user saying "I want to text my customers" should still never have to understand that as "create a campaign."

## Top-Level Navigation
```text
Home · Campaigns · Messages
```

```text
Campaigns
  Campaign list
  Campaign detail
    Overview
    Budget            (ledger: planning / authorized / reserved / reported / settled / client available)
    Creatives         (attached to this campaign; links out to the full reusable library)
    Ad Units          (scoped to this campaign)
    Leads             (leads attributed to this campaign)
    Landing Pages     (reusable library, reached from overview destination)
    Platforms / Deployments
    Performance       (this campaign's funnel: views → clicks → leads → sales)

Messages
  New Message
  Scheduled
  Contacts
    → Interactions
  Audiences
  Templates
  Automations
  Performance         (message-side funnel: sent → opened → replied → leads → sales)
```

Sales stay reachable from a Contact's own detail view (a sale is recorded against a contact, not filed under either surface) rather than getting a nav entry of its own — consistent with how neither surface owns the shared spine outright.

## Home vs. Per-Surface Performance
No blended cross-channel "Results" or "Reports" surface exists anymore — that job is split:

- **Home** — operational, "what needs me today": new leads, unanswered replies, follow-ups due, failed sends, automation errors, pending approvals. Unchanged from the prior revision — this is the training pack's "Start of Day" checklist (`02-daily-account-operations.md`) made into the landing screen.
- **Campaigns → Performance** and **Messages → Performance** — each surface reports its own funnel and outcomes in its own vocabulary (spend/CPL/ROAS on the Campaigns side; sent/opened/reply-rate on the Messages side) rather than one shared page trying to speak both languages at once.

A cross-channel blended view (e.g. "total pipeline regardless of source") is a real capability the backend already supports (`GET /results` still exists and still computes it — see `apps/server/src/services/DashboardService.ts`) but is intentionally not promoted to a nav destination or given a page of its own labeled "Results"/"Reports." If a blended number earns a place in the product later, it belongs as a small, unnamed section on Home, not a third way of asking "what happened" alongside the other two.

## Assets — No Dedicated Nav Item
The shared Asset library (`00-unified-data-model.md`) does not get its own top-level surface. It appears contextually as a picker inside the Template composer (Messages) and the Creative composer (Campaigns) — same underlying object, reused inline, consistent with both packs' existing rule against adding navigation for an entity just because it exists in the database.

## Automations Must Be Source-Agnostic
Automations lives under Messages, since its actions are messaging actions (send email/text, notify user, change status). But its trigger picker must expose **"New lead"** as a general trigger covering any `source_type` — not only "Message reply." If the only visible trigger is reply-based, a Campaign-sourced lead silently never gets a follow-up, which recreates the exact gap the unified data model was built to close. Reply-based triggers remain available as a separate, additional option, not a replacement.

## Contacts Lives Under Messages, Not Top-Level
Reverses the prior revision's "Contacts as Top-Level Is a Deliberate Departure" section outright. Contacts is still the shared spine both surfaces feed — that hasn't changed, and still isn't up for debate — but *browsing* contacts is now reached through `Messages → Contacts`, not a standalone top-level tab. The practical case for this: a business's day-to-day contact-browsing habit (who replied, who needs a follow-up, whose stage needs updating) is almost always tied to a communication task, which already lives in Messages; a Lead that originated from a Campaign is still the exact same Contact record and still shows up there, so nothing about a paid-sourced lead becomes harder to find — it's one hop through Messages → Contacts either way, the same distance a top-level tab would have been.

## Landing Pages and Creatives Are Reusable Libraries, Reached Through Campaign Detail
Both are genuinely reusable across many campaigns (`00-unified-data-model.md`'s Creative section; `LandingPage` has no owning `campaignId` — it's referenced per-`Deployment`/`AdUnit`), so nesting them under one Campaign's detail view needs a specific meaning or it contradicts the data model: **`Campaign detail → Landing Pages` and `Campaign detail → Creatives` show what's attached to *this* campaign, with a link out to the full library** (create new, browse everything, see which other campaigns reuse the same page/creative). The discovery path the user takes to get there is through a campaign; the objects themselves still belong to the business, not to that campaign — matching the "Asset Hub" concept in `docs/site-design-proposal.md` (landing pages "can be reused across multiple campaigns" even though they're configured from within one).

Ad Units keep the placement from the prior revision — nested in Campaign detail, not their own surface, since (unlike Landing Pages/Creatives) an AdUnit is scoped to one campaign the way a Deployment is.

## Explicitly Not Done
- Message and Campaign are not merged into a generic object ("Outreach," "Activity") anywhere in the UI. They share backend infrastructure only; workflows stay separate because they're genuinely different (recipients/scheduling/personalization vs. creatives/platforms/budget/deployment).
- "Campaign" is not used as a label anywhere inside the Messages surface.
- "Results" and "Reports" are not used as navigation labels anywhere — see "Home vs. Per-Surface Performance" above.
- Forms still get no nav surface at all — a Form is selected or created inline while authoring a Landing Page, never browsed as its own section, unchanged from the prior revision.
