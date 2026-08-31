Ad setup vs media-order review

The setup page answers only: what am I advertising, and where should it appear? Time, audience, budget, destination URL, and platform consequences live on a separate confirmation that is a small media order. That friction is intentional: it is where a creative becomes a purchase instruction.

Publish and Start are reserved until LOOPIE can actually activate spend (activate on the connector). Today the paid CTA is Send draft. The confirmation layout stays the same in the future; only the final verb and capability change.

flowchart TD
setup[Setup: creative plus where]
save[Save]
continue[Continue]
pages[Put ad on page]
review[Review advertising details]
send[Send draft]
manager[Activate in Ads Manager]

setup --> save
setup --> continue
continue -->|pages only| pages
continue -->|paid selected| review
review --> send
send --> manager

Setup page (keep it simple)

Creative at top. Destinations below as intent only. No $ spinner, dates, or geography.

Where should this ad appear?

Facebook — Feed

Google — Display

YouTube — Video

Pages — existing landing pages, name only.

Paid destination checked → media-order review

Pages only → apply LOOPIE placements (no money modal)

Page rows can also use Put ad on page directly because LOOPIE owns that destination

Labels the user sees are destinations, not APIs. META/FEED, GOOGLE/DISPLAY, GOOGLE/YOUTUBE stay in [adPreview.ts](apps/web/src/lib/adPreview.ts) as implementation keys. Confirmation (and later a destination expander) can get more specific: Facebook Feed, Google Display, YouTube In-stream video — so Stories/Reels, Search/Shopping, Shorts/In-feed can appear later without changing the top-level model.

TikTok drops off this list. No Google/YouTube connectors this pass; Continue still collects the order, createAndProvision leaves those runs unsent until a connector exists.

Media-order confirmation (reusable surface)

New [AdBuyReview.tsx](apps/web/src/components/ads/AdBuyReview.tsx) in existing [Modal](apps/web/src/components/ui/Modal.tsx). One review per paid destination (Facebook first if several). This is the important reusable surface — not a throwaway dialog.

Where — Facebook Feed (Google Display, YouTube In-stream video)

Audience — country plus optional location targeting (e.g. Austin + 25 miles). Collect here. Persist on the run snapshot. Meta pushDraft still only sends connection defaultCountry this pass; do not imply Facebook received city/radius until the connector maps it

Schedule — starts (date), ends (date or none). If no end: Until manually stopped. Do not invent a 7-day total

Budget — Daily budget $25 (a spending instruction to the platform, not a price). Estimated maximum only when an end date exists (daily × days)

Destination — click-through URL / hosted page

Footnotes (paid, always):

Facebook

Draft sent

Facebook status: Paused

Snapshot: $25/day, audience, schedule

Preview · Open Ads Manager

Not Facebook RUNNING. LOOPIE knows it provisioned a draft; it does not know spend is running unless the connector says so.

Same row later, when activate + status sync exist: Live, spend, reach, responses — View ad · Manage. Same UI, better capabilities.

Pages keep a direct LOOPIE status (on the page / not) because we own delivery.

Sent run = snapshot; edits from capabilities

Once a run has been sent externally, published configuration is a snapshot. Editing the parent Advertisement must not pretend to edit Facebook.

Show the frozen order: media, destination, audience, budget, schedule, sent date.

Field actions come from the connector/capability registry, not hardcoded page logic. Today Meta is pushDraft: true, activate: false, no live budget/audience/schedule update:

Media, placement, audience, budget, schedule — locked / view only

Open Ads Manager

Later flags (activate, editBudget, etc.) unlock Pause / Edit on those fields.

If the user changes the parent Advertisement after a send: Your changes are saved in LOOPIE. The Facebook version is unchanged. Do not auto-push. A future “Update Facebook” or “Create new Facebook version” is out of this pass; the copy is in this pass.

Copy

Rewrite [adCopy.ts](apps/web/src/lib/adCopy.ts). Setup explains where, not money. Kill “a running buy stays on until you pause it,” daily-budget-on-the-row, and Start.

Tests

Setup: Facebook / Google / YouTube; no /day on the row; Save and Continue; no Start/Publish

Continue with Facebook opens review with Where / Audience / Schedule / Budget / Destination and Send draft

After send: Draft sent, not Running; Preview / Ads Manager when URLs exist

e2e: check Facebook → Continue → Send draft

Here’s the condensed design summary for LOOPIE’s advertisement creation, platform-buy setup, publishing, and live management UX:

Advertisement is the main user object. Users create one Advertisement with media, copy, CTA, and destination; platform-specific execution lives underneath as Platform Runs (AdRun).
Platform selection stays simple. The setup surface should present human destinations like Facebook, Google, YouTube, LOOPIE Pages, while internal details such as META/FEED or GOOGLE/YOUTUBE remain implementation-level placement data.
Placement drives validation and preview. PLATFORM_CAPABILITIES defines compatible media, aspect ratios, copy limits, destination requirements, and preview framing by platform + placement.
Do not imply spend starts when LOOPIE cannot start it. Today Facebook can only receive a paused draft. Therefore the current action should be Send draft / Send to platform, not “Start” or “Publish.” Reserve Publish/Start for future connectors that can actually activate spend.
Use a paid-media confirmation screen. After choosing a paid destination, review where it will appear, targeting/location, schedule, budget, destination URL, and what LOOPIE can/cannot control. This is the correct place for complexity, not the initial setup screen.
Budget language must be precise. $25/day is a platform daily budget/cap, not the price of the ad or a guaranteed charge. Actual delivery and spend are determined by the platform auction.
LOOPIE Pages are different. First-party page placements are under LOOPIE’s control and can be enabled/disabled directly without the third-party spend confirmation flow.
Separate LOOPIE state from platform state. A run can be Draft sent, Failed, Needs attention, etc., while platform delivery may independently be Paused, Active, Ended, or Unknown. Never show “Running” merely because LOOPIE created the run.
After sending, treat the platform configuration as a snapshot. Changing the parent Advertisement does not silently modify a Facebook/Google/YouTube version. Show what was actually sent and whether LOOPIE can edit budget, schedule, targeting, media, or status.
Management should become capability-driven. Today a Facebook run may show Draft on Facebook · Open Ads Manager; later, once APIs allow it, the same surface can expose Activate, Pause, Edit budget, Edit schedule, and synchronized spend/status.
Running-ad monitoring rolls upward. Advertisement detail should aggregate Spend → Reach/Views → Clicks/Response → Leads → Sales → Revenue, with drilldown into each Platform Run, its placement, budget, delivery state, preview/live URL, manager URL, errors, and attribution.
Global Advertisement control is derived from child runs. Off/Mixed/On should reflect actual run states rather than storing an ambiguous parent status.
Provisioning is idempotent. Validate → create/reuse AdRun → send to connector → persist external IDs/URLs/status → retry the same run on failure rather than creating duplicates.
Ideal first platform UX targets: Facebook Feed, Google Display/Search, and YouTube video. Keep the destination-level UI simple now while allowing placements to expand later.
The overall cognitive model is: Create the ad → choose where it should appear → review the buy → send/publish according to connector capability → monitor delivery and business results in LOOPIE.
