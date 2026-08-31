# LOOPIE Paid Media Order Confirmation — Product and Architecture Proposal

**Status:** Proposed  
**Surface:** Advertisement → Create paid run  
**Working route:** `/ads/:advertisementId/orders/new`  
**Primary user:** A small-business owner, manager, or LOOPIE operator preparing or authorizing paid media  
**Single job:** Confirm exactly what LOOPIE will ask a platform to buy, who may authorize it, and what happens after confirmation

## 1. Executive decision

The next paid-media surface should be a **media order confirmation**, not a generic “review ad” modal.

The screen creates a durable agreement between the user, LOOPIE, and the external advertising platform. It answers:

- What business outcome are we trying to produce?
- Who may see the ad, and who is excluded?
- Where will it appear?
- Which exact creative version will be used?
- Where will people go, and what counts as success?
- Which platform account and billing identity own the buy?
- When may it run, in which timezone, and when does it end?
- What budget behavior and maximum authorization apply?
- What will the platform own after publish, and what may still be edited in LOOPIE?
- Does the final action save, request approval, send a paused draft, submit for review, or authorize live spend?

The screen's signature element is an **authorization sentence** generated from the actual order:

> Spend up to **$900 USD** to **get Leads** from **homeowners near Austin** on **Facebook Feed and Reels**, from **September 1 at 8:00 AM** through **September 30 at 11:59 PM Central**, using **Advertisement version 3**, billed to **Facebook · Riverside Mechanical**.

If LOOPIE cannot produce a truthful sentence from the order, the order is not ready to confirm.

## 2. Why this screen comes next

The running Ad Run screen depends on decisions this confirmation must settle first: Goal, conversion event, Audience, placements, account, schedule, budget semantics, creative snapshot, approval, provider lifecycle, and field ownership.

Designing run management before this contract would leave the product unable to explain what the run is supposed to be, what changed, or whether a local edit reached the platform.

The confirmation screen therefore becomes the boundary between:

```text
Editable Advertisement
        ↓
Versioned media order
        ↓
Approval / spend authorization
        ↓
Provider submission
        ↓
One or more Ad Runs and placement executions
        ↓
Platform review, delivery, sync, reconciliation, and Activity
```

## 3. What exists today

LOOPIE already has an early version of this flow in `AdBuyReview`.

| Area               | Present capability                                                                                | Gap to resolve                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review UI          | Modal collects country, free-text location, dates, daily budget, Landing Page, and media name     | No Goal, conversion event, account identity, targeting model, exclusions, placements, variants, approval, estimates, or ownership disclosure                  |
| Final action       | **Send draft**                                                                                    | Correctly safe for current Meta behavior, but does not explain the exact external objects created, approval authority, or downstream review states            |
| Order snapshot     | `AdRun.orderSnapshot` freezes the current loose order JSON                                        | Unversioned and untyped; not independently addressable; incomplete audit record                                                                               |
| Account connection | One PlatformConnection per business/platform stores ad account, Page, and default country         | Account display name, billing profile, currency, timezone, multiple accounts, permission scope, and immutable run linkage are missing                         |
| Goal               | Meta connector hardcodes traffic / link-click optimization                                        | User cannot choose a human Goal; provider mapping is not represented or audited                                                                               |
| Targeting          | Meta connector sends default country only                                                         | Review's location string is not translated to provider targeting; no demographics, interests, keywords, exclusions, remarketing, lookalikes, or saved presets |
| Budget             | AdRun has one decimal `budget`; UI treats it as daily; client estimates total by multiplying days | No currency, budget type, pacing, shared/lifetime budget, provider minimum, or authoritative maximum-spend semantics                                          |
| Schedule           | Start/end dates become UTC day boundaries                                                         | Time-of-day and advertiser timezone are absent; “no end date” exists only as empty end date; DST behavior is undefined                                        |
| Creative           | Advertisement owns a mutable Asset pool; already-sent runs are intentionally unchanged            | Good direction, but a run does not point to a named Advertisement/creative revision or exact selected variant snapshot                                        |
| Status             | PENDING, READY, ACTIVE, PAUSED, ENDED, validation/provisioning failures                           | Provider review, eligibility, limited delivery, rejection, and sync health are not modeled separately                                                         |
| Provisioning       | Meta creates paused campaign/ad set/ad objects idempotently                                       | Google/TikTok are unregistered; success still requires manual activation; no pull sync or remote mutation                                                     |
| Performance        | Ad Runs hold spend/impressions/clicks/conversions; Advertisement performance derives Leads/Sales  | Manual/unsynced platform metrics can look equivalent to reconciled data; LOOPIE and platform conversions are not separated                                    |
| Finance            | BudgetAuthorization, reported AdSpend, settled AdSpend, ledger entries, and Reconciliation exist  | Confirmation does not show how planned budget relates to authorization, available funds, provider charges, and settled amounts                                |
| Public view        | `previewUrl` and `managerUrl` are nullable                                                        | Existing copy still risks implying a universal “View live” capability                                                                                         |
| Activity           | Home already exposes run failures; Activity proposal treats run transitions as first-class        | Order approval, provider review, sync, threshold, and reconciliation events are not yet normalized                                                            |

### Assessment

The current implementation has a strong safety property: Meta receives a **paused draft**, and attached Advertisement media changes do not silently mutate an existing external run. The proposal preserves both.

The largest immediate contract gaps are:

1. the order does not say what it is optimizing for;
2. the targeting shown in review is not the targeting sent to Meta;
3. `budget` and date fields are too ambiguous for real spend;
4. the order snapshot is not a durable versioned object;
5. no sync closes the loop after provisioning.

## 4. Product principles

### 4.1 Summary first, evidence on demand

The first view remains simple. Show the authorization sentence, seven summary rows, validation, and one primary action. Each row expands in place for provider-specific configuration and evidence.

The seven rows are:

1. Goal and success
2. Audience and location
3. Placements and creative
4. Destination and tracking
5. Schedule
6. Budget and funding
7. Platform account and ownership

This is progressive disclosure, not hidden configuration. Every field affecting spend, eligibility, delivery, attribution, or compliance must be visible before confirmation, either in the summary or its expanded row.

### 4.2 LOOPIE asks human questions

Use **Goal: Get Leads**, not `OUTCOME_LEADS`; **Success: Lead created**, not an opaque provider event id; **People near Austin**, not a raw targeting JSON editor.

Connectors map human intent into supported provider settings and return the mapping for review:

```text
Goal: Get Leads
Facebook will optimize for: Landing page views until enough Lead events are available
```

Never silently fall back. If the provider cannot optimize directly for the chosen success event, explain the fallback and require confirmation.

### 4.3 The final button names the commitment

The label changes based on capability and user authority:

| Situation                                        | Primary action                                      |
| ------------------------------------------------ | --------------------------------------------------- |
| User may prepare but not approve spend           | **Request approval**                                |
| Approver must authorize before submission        | **Approve media order**                             |
| Connector creates a non-spending provider draft  | **Send paused draft to Facebook**                   |
| Connector submits for review but cannot activate | **Submit for platform review**                      |
| Connector may activate and spend after review    | **Publish and authorize up to $900**                |
| Validation or account setup is incomplete        | No primary action; show the exact corrective action |

Do not use **Publish**, **Launch**, **Start**, or **Go live** unless that action can actually begin spend.

### 4.4 Platform acceptance is not delivery

Persist and display three independent axes:

- **LOOPIE order state** — drafting, approval, submission, cancellation.
- **Platform delivery state** — draft, review, eligible, live, paused, limited, rejected, ended.
- **Sync health** — current, delayed, failed, disconnected, or never synced.

One badge cannot truthfully represent all three.

### 4.5 External publish always uses an immutable version

Every submission points to a frozen MediaOrderRevision and AdvertisementVersion. The running screen says:

> Facebook is using Advertisement version 3 · Media order revision 2

Editing the reusable Advertisement creates a new version but does not alter an external run. Updating a live buy creates a new MediaOrderRevision and follows the field-specific provider change policy.

## 5. Core screen

### Desktop composition

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Facebook · Riverside Mechanical                         Connected · USD      │
│ Review media order                                      Advertisement v3     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Spend up to $900 to get Leads from homeowners near Austin on Facebook       │
│ Feed and Reels, Sep 1–30 Central, using Advertisement version 3.             │
├───────────────────────────────────────────┬──────────────────────────────────┤
│ ORDER                                     │ ADVERTISEMENT VERSION 3          │
│                                           │                                  │
│ Goal and success                          │ [Feed preview] [Reels preview]   │
│ Get Leads · Lead created              [›] │                                  │
│                                           │ Summer service offer             │
│ Audience and location                     │ 1 square image · 1 vertical video│
│ Austin + 25 mi · Homeowners · 18+     [›] │                                  │
│ 2 exclusions · Est. audience 82k–110k     │ Assets selected explicitly       │
│                                           │ for this order                    │
│ Placements and creative                    │                                  │
│ Feed + Reels · 2 variants             [›] │ [Inspect version]                │
│                                           │                                  │
│ Destination and success                   │ PROVIDER GUIDANCE                 │
│ Riverside Service · Lead form submit  [›] │ Estimated daily reach 1.8k–3.2k │
│                                           │ Budget meets Facebook minimum     │
│ Schedule                                  │ Estimate from Facebook · 4m ago   │
│ Sep 1, 8 AM – Sep 30, 11:59 PM CT    [›] │ Not a promised result             │
│                                           │                                  │
│ Budget and funding                        │ VALIDATION                        │
│ $30/day · Up to $900 USD              [›] │ ✓ Destination and Lead event      │
│ Client ad funds · $1,240 available        │ ✓ Feed and Reels media             │
│                                           │ ✓ Account permission               │
│ Account and ownership                     │ ! Reels caption is near limit      │
│ Facebook · Riverside Mechanical       [›] │                                  │
├───────────────────────────────────────────┴──────────────────────────────────┤
│ Sending creates paused drafts. No spend starts from this action.             │
│ [Back] [Save draft]                              [Send paused draft to Facebook]│
└──────────────────────────────────────────────────────────────────────────────┘
```

The authorization sentence is the hero because the page's purpose is informed commitment, not visual admiration of the ad. Creative preview remains important but secondary.

### Mobile

- Authorization sentence, validation, and primary action remain above the first long scroll.
- Creative preview becomes one compact carousel.
- Summary rows expand into full-width sheets.
- The sticky footer repeats the maximum authorized amount and exact action.
- Returning from account connection or destination editing restores the order draft.

## 6. Section behavior

### 6.1 Goal and success

Human Goals:

| Goal               | Plain meaning                                | Typical provider optimization candidates                    |
| ------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| Get Leads          | Ask interested people to identify themselves | Lead event, form completion, landing-page view fallback     |
| Get Sales          | Produce attributable purchases               | Purchase/conversion event, value optimization when eligible |
| Get Website visits | Bring qualified people to the destination    | Landing-page view or link click                             |
| Get phone calls    | Produce trackable calls                      | Call conversion or call-click proxy                         |
| Get video views    | Have people watch the creative               | ThruPlay/video-view family                                  |
| Build awareness    | Reach relevant people efficiently            | Reach or impressions                                        |

Every order has one `goal` and one primary `successEvent`. Secondary measured outcomes may still appear in reporting.

Success event options are constrained by Destination and installed tracking:

- Form submitted
- Lead created
- Purchase or payment completed
- Sale recorded
- Qualified phone call
- Provider-native conversion
- Page visit only when a stronger event is unavailable

The review shows both LOOPIE and provider mappings. Missing tracking blocks conversion-optimized submission or requires an explicit weaker fallback.

### 6.2 Audience and targeting

The collapsed row shows only:

```text
Austin + 25 mi · Homeowners · 18+
2 exclusions · Estimated audience 82k–110k
```

Expanded targeting is grouped in plain language:

- **Location:** countries, regions, cities, ZIP codes, radius, included/excluded locations, presence rule.
- **People:** age range, language, and demographic rules where legally/provider allowed.
- **Interests or intent:** interests for discovery platforms; keywords and negatives for Search.
- **Known audiences:** customer lists, Lead lists, page visitors, ad engagers.
- **Expansion:** lookalike/similar audience and provider audience expansion.
- **Exclusions:** current customers, converted Leads, employees, excluded locations, negative keywords.
- **Delivery windows:** days/hours when relevant to response capacity.

Targeting capabilities are provider- and objective-specific. Unsupported fields do not render as disabled universal controls; the connector returns the applicable schema and validation.

Saved targeting presets come later, but the initial contract should support `targetingPresetId` plus a frozen resolved snapshot. Editing a preset never changes an existing order.

Sensitive categories require explicit policy treatment. Demographic controls may be unavailable or restricted based on jurisdiction, declared category, provider rules, or Goal.

### 6.3 Placements and creative variants

The user selects placement intent without having to understand provider object graphs:

```text
Facebook
✓ Feed       Square image · Headline A
✓ Reels      Vertical video · Caption A
□ Stories    No compatible 9:16 asset
```

LOOPIE never silently picks creative after confirmation. The revision freezes:

- placement;
- selected Asset id and immutable Asset/version reference;
- crop/transform;
- body copy, headline, description, CTA, and destination override;
- provider format mapping;
- validation result and warnings.

#### One Ad Run or several?

An **Ad Run is one provider-level budget, targeting, optimization, schedule, and lifecycle unit**. It may contain multiple `PlacementExecution` children when the provider delivers those placements under that same unit.

Create separate Ad Runs when any of the following differ:

- budget or pacing;
- targeting;
- optimization Goal or conversion event;
- schedule;
- provider campaign/ad group identity;
- independent pause/status lifecycle;
- reporting must support an independent decision.

This means Facebook Feed + Reels may be one Ad Run with two placement executions, while Google Search and YouTube are separate Ad Runs even if prepared from the same Advertisement.

### 6.4 Destination and conversion event

The row always displays both:

```text
Send people to: Riverside Service page
Count success when: Lead created from “Free estimate” form
```

Freeze the destination contract at order submission:

- LandingPage id and published version;
- tracked redirect URL;
- resolved final URL and domain;
- Form id/version when relevant;
- primary conversion event id/type;
- tracking readiness and last verified time;
- call tracking number or commerce event mapping where applicable.

Publishing a new Page version does not silently rewrite a running order's destination snapshot. A deliberate destination update creates a new order revision and follows provider edit/recreate rules.

### 6.5 Platform account and billing identity

The collapsed identity is quiet but unambiguous:

> Facebook · Riverside Mechanical · USD

Expanded details include:

- connected platform and account display name;
- external ad account id;
- billed business/profile where available;
- currency and account timezone;
- connected Page/profile/brand identity;
- connection health, permission scope, and last verified time;
- who pays the platform directly;
- LOOPIE funding/authorization account when different.

The submitted revision stores the exact `ChannelAccount`/advertiser account reference. Reconnecting the business to another account must not make old runs appear to belong to the new one.

### 6.6 Estimates and spend guidance

Provider estimates are optional evidence, not promises. Display only when returned for the exact current account, Goal, targeting, placements, schedule, and budget revision.

An estimate includes:

- audience size or available search volume;
- estimated daily reach/impressions/click range when supplied;
- provider minimum and recommended budget warnings;
- insufficient-budget or likely-no-delivery warnings;
- saturation warning for a small Audience;
- timestamp, provider source, and expiration;
- changed-since-estimate indicator when inputs no longer match.

LOOPIE-authored guidance must be labeled separately from provider estimates. Never synthesize precision from generic CPM/CPC examples.

### 6.7 Schedule and end semantics

Schedule is an explicit interval:

```text
Starts: September 1, 2026 · 8:00 AM
Ends: September 30, 2026 · 11:59 PM
Timezone: America/Chicago (Central)
```

Or:

```text
Starts: September 1, 2026 · 8:00 AM
No end date · Runs until paused or ended
Timezone: America/Chicago (Central)
```

Contract requirements:

- store timezone as an IANA identifier, not only an offset;
- store resolved UTC instants for the submitted revision;
- distinguish `NO_END` from a missing/invalid end value;
- define inclusive/exclusive end semantics;
- show DST adjustments before confirmation when the interval crosses a change;
- preserve provider account timezone mapping where the provider requires it;
- warn when start is too soon for review or when end precedes likely approval.

### 6.8 Budget and funding

The simple UI may say **$30/day · Up to $900**, but the contract distinguishes:

```ts
type BudgetSpec = {
  kind: 'DAILY' | 'DAILY_AVERAGE' | 'LIFETIME' | 'CAMPAIGN_SHARED'
  amountMinor: number
  currency: string
  pacing: 'STANDARD' | 'ACCELERATED' | 'PROVIDER_DEFAULT'
  maximumAuthorizedMinor?: number
  sharedBudgetRef?: string
  providerBillingThresholdMinor?: number
}
```

Keep these amounts separate everywhere:

1. **Planned budget** — desired buying instruction.
2. **Authorized maximum** — spend authority granted in LOOPIE.
3. **Provider-reported spend** — current platform claim.
4. **Settled spend** — finalized provider charge.
5. **LOOPIE ledger amount** — reserved, posted, or reconciled client funds.

The confirmation shows available funds and whether the platform bills the business directly. “Up to” is shown only when LOOPIE can derive a defensible cap from schedule and provider semantics. A provider's daily average is not described as a hard daily ceiling.

## 7. Review, approval, and provider lifecycle

### LOOPIE order states

```text
DRAFT
→ AWAITING_APPROVAL
→ APPROVED
→ SUBMITTING
→ SUBMITTED | PARTIALLY_SUBMITTED | SUBMISSION_FAILED
→ CANCELED
```

Approval records the revision, approver, role, amount, currency, time, and acknowledgement text. Any material edit after approval invalidates approval and creates a new revision.

Material fields include account, Goal, success event, targeting, placement, creative, destination, schedule, budget, and anything a connector marks `requiresReapproval`.

### Provider states

Normalize provider-specific delivery without erasing raw status:

```text
NOT_SENT
DRAFT_SENT
UNDER_REVIEW
ELIGIBLE
LIVE
PAUSED
LIMITED
REJECTED
ENDED
UNKNOWN
```

Store raw provider state, reason codes, effective time, and last sync independently. `ELIGIBLE` does not necessarily mean delivering; `LIVE` does not promise impressions; `PAUSED` records whether LOOPIE, the provider, or a platform user initiated it when known.

### Sync health

```text
CURRENT · DELAYED · FAILED · DISCONNECTED · NEVER_SYNCED
```

Status is `CURRENT` only within the connector's declared freshness SLA. UI copy says **Last synced 4 minutes ago**, not **Live**, when data is poll-based.

## 8. Validation and policy feedback

Validation runs before approval and again immediately before provider submission.

### Categories

- Account and permission
- Goal and conversion readiness
- Targeting and restricted category
- Creative format and policy
- Copy, disclosure, and destination policy
- Destination availability and tracking
- Schedule and provider lead time
- Budget minimum, currency, and funding authority
- Duplicate/retry safety

Each result has severity, affected placement, source, provider code, plain-language explanation, and corrective action.

```text
Needs attention · Facebook Reels
The video is 72 seconds; this placement accepts up to 60 seconds.
[Choose another video] [Remove Reels]
```

Platform rejections arrive later through sync and create actionable Activity items. Never overwrite the original validation result; preflight and provider review are separate facts.

## 9. Source-of-truth rules

Every connector declares ownership and mutation capability per field. The submitted revision stores the evaluated policy.

| Field                | Before submission                         | After submission default                                   | UI behavior                                            |
| -------------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Advertisement name   | LOOPIE                                    | LOOPIE                                                     | Rename does not alter provider object                  |
| Creative/media       | LOOPIE                                    | Snapshot immutable; provider execution references snapshot | New version and provider update/recreate               |
| Goal/optimization    | LOOPIE intent, connector mapping          | Usually provider object; effectively immutable             | Create new run unless connector proves safe edit       |
| Targeting            | LOOPIE when supported, otherwise provider | Connector capability-specific                              | Show LOOPIE value, platform value, and drift           |
| Placements           | LOOPIE intent                             | Provider may expand/optimize if authorized                 | Show requested vs effective placements                 |
| Budget               | LOOPIE authorization + provider delivery  | Shared/connector-specific                                  | Remote mutation only with confirmation and resync      |
| Schedule             | LOOPIE order                              | Shared/connector-specific                                  | Remote mutation only when supported                    |
| Destination          | LOOPIE tracked URL and revision           | Usually provider creative/ad                               | Update or recreate based on capability                 |
| Delivery status      | Provider after submission                 | Provider                                                   | LOOPIE commands are requests until synced confirmation |
| Spend/metrics        | Provider reported                         | Provider                                                   | Never manually overwrite synced source                 |
| LOOPIE attribution   | LOOPIE                                    | LOOPIE                                                     | Report separately from provider conversions            |
| Settled spend/ledger | Financial records                         | LOOPIE reconciliation                                      | Never replace with delivery estimate                   |

When a field differs, display:

```text
Budget
LOOPIE requested: $30/day
Facebook effective: $35/day
Changed in Facebook Ads Manager · 18 minutes ago
[Accept platform value] [Change to $30/day]
```

Do not silently force one value over the other.

## 10. Version and change behavior

### Version chain

```text
Advertisement v3
└── MediaOrder revision 2 · approved by Alex
    ├── Facebook Ad Run · using v3 / r2
    │   ├── Feed execution · Square image A
    │   └── Reels execution · Vertical video B
    └── Google Search Ad Run · using v3 / r2
        └── Search execution · Headline set C
```

Every external submission records:

- AdvertisementVersion id;
- MediaOrderRevision id and hash;
- connector version/mapping version;
- selected account and provider objects;
- exact creative variants and destination snapshot;
- approval and budget authorization;
- idempotency key and submission attempts.

### Safe editing of live buys

Live actions use explicit commands, not generic record edits:

- Edit budget
- Extend schedule
- Change end time
- Pause
- Resume
- End
- Replace creative
- Change destination

Before execution, show scope, spend effect, provider behavior, fields that will be recreated, approval requirement, and rollback limitations.

```text
Pause Facebook Feed + Reels?
Facebook may continue reporting delayed impressions and spend after the pause is accepted.
LOOPIE will keep the run open until Facebook confirms Paused.

[Keep running] [Request pause]
```

Local state changes to **Pause requested**, not **Paused**, until the platform confirms.

## 11. Preview and external links

Use capability-based labels:

- **Preview in LOOPIE** — local rendering from the frozen creative snapshot.
- **Platform preview** — provider-generated preview when available.
- **View public ad** — only when the provider returns a genuinely public permalink.
- **Open in Facebook Ads Manager** — authenticated manager link.

Do not display an empty **View ad** action. `previewUrl`, `publicUrl`, and `managerUrl` are distinct nullable capabilities.

## 12. Attribution and cost reconciliation

### Attribution

Never blend these into one conversion count:

| Measurement        | Meaning                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| LOOPIE attributed  | First-touch sessions, Leads, Sales, and Revenue connected through LOOPIE tracking |
| Platform reported  | Conversions the provider attributes under its own window and model                |
| Matched/reconciled | Events LOOPIE can confidently match across both systems                           |
| Unmatched          | Present in one system without a reliable counterpart                              |

The running screen may compare them, but labels and tooltips always preserve the model and window.

### Cost

Show planned, authorized, reported, settled, and ledger values as separate rows. Variance is an explicit Reconciliation result, not a corrected historical overwrite.

## 13. Permissions

Define capabilities rather than hard-code roles:

- `ads.prepare`
- `ads.requestApproval`
- `ads.approveSpend`
- `ads.submitDraft`
- `ads.activateSpend`
- `ads.editLiveBudget`
- `ads.pauseResume`
- `ads.end`
- `ads.resolvePolicyIssue`
- `ads.viewFinancials`

Approval policy may depend on amount, account, platform, or change type. Preparing creative does not imply permission to activate spend. The confirmation screen derives its action and explanatory copy from effective capability plus order state.

## 14. Activity integration and monitoring

Create Activity items for meaningful transitions:

- Media order drafted or approval requested
- Approved, declined, or approval invalidated by edit
- Submission started, partially completed, or failed
- Draft accepted by provider
- Under review, eligible, rejected, limited, live, paused, resumed, or ended
- Creative, targeting, destination, schedule, or budget drift detected
- Budget threshold reached or projected to exceed authorization
- Spend spike or delivery stopped
- No Leads after configured spend
- Click/Lead/Sale/conversion milestone
- Sync delayed, failed, reauthenticated, or recovered
- Reported/settled/ledger cost mismatch

High-volume impressions, clicks, and attributed visits follow the Activity rollup policy. Failures, policy rejection, budget issues, unexpected drift, and user-defined threshold breaches are promoted to **Needs action**.

### Monitoring rules

Start with plain watch rules:

```text
Tell me when daily reported spend exceeds $100
Tell me when this run spends $250 without a Lead
Tell me when delivery stops for 6 hours during its schedule
Tell me when click-through rate falls 40% below its 7-day baseline
```

Each rule declares data source, evaluation window, minimum sample, cooldown, severity, and action owner. A rule never claims a problem when sync is too stale to evaluate it.

## 15. Running Ad Run screen implied by this proposal

Once the media order contract exists, run management becomes straightforward:

1. **What is it?** Platform/account, Goal, placements, version, destination, schedule, budget.
2. **Is it delivering?** Provider state, sync health, effective configuration, policy issues.
3. **What has it spent?** Planned, authorized, reported, settled, ledger.
4. **What happened?** Views/clicks, LOOPIE Leads/Sales/Revenue, platform conversions.
5. **Which execution works?** Placement + creative variant comparison.
6. **What may I do?** Capability-aware pause, resume, end, edit, retry, or open in manager.

Advertisement detail compares Ad Runs and placement executions by:

- reported spend;
- impressions/views and clicks;
- LOOPIE Leads, Sales, and Revenue;
- platform-reported conversions;
- CPL and cost per Sale;
- creative version and variant;
- destination and conversion event;
- provider state, sync freshness, and policy issues.

The screen supports decisions rather than presenting a raw platform-metric table.

## 16. Proposed domain contract

```ts
type MediaOrderRevision = {
  id: string
  mediaOrderId: string
  revision: number
  advertisementVersionId: string
  platformAccountId: string
  goal: 'LEADS' | 'SALES' | 'TRAFFIC' | 'CALLS' | 'VIDEO_VIEWS' | 'AWARENESS'
  successEvent: ConversionEventSnapshot
  targeting: TargetingSnapshot
  placements: PlacementCreativeSnapshot[]
  destination: DestinationSnapshot
  schedule: ScheduleSpec
  budget: BudgetSpec
  providerMapping: ProviderMappingSnapshot
  sourceOfTruthPolicy: FieldOwnershipSnapshot
  estimate?: ProviderEstimateSnapshot
  validation: ValidationSnapshot
  contentHash: string
  createdByUserId: string
  createdAt: string
}

type MediaOrder = {
  id: string
  businessId: string
  advertisementId: string
  currentRevisionId: string
  state:
    | 'DRAFT'
    | 'AWAITING_APPROVAL'
    | 'APPROVED'
    | 'SUBMITTING'
    | 'SUBMITTED'
    | 'PARTIALLY_SUBMITTED'
    | 'SUBMISSION_FAILED'
    | 'CANCELED'
}

type AdRun = {
  mediaOrderRevisionId: string
  platformAccountSnapshotId: string
  providerState: string
  providerRawState?: string
  providerStateReason?: string
  syncHealth: 'CURRENT' | 'DELAYED' | 'FAILED' | 'DISCONNECTED' | 'NEVER_SYNCED'
  lastSyncedAt?: string
  effectiveConfiguration: unknown
  placementExecutions: PlacementExecution[]
}
```

Prefer normalized columns for identifiers, states, money, time, ownership, and query-critical references. Structured snapshots may use JSON but require a schema version and content hash.

## 17. Connector capability contract

Extend the connector contract beyond `pushDraft`, `pullSpend`, and simple edit flags:

```ts
type ProviderCapabilities = {
  accountIdentity: boolean
  targetingSchema: boolean
  estimates: boolean
  pushDraft: boolean
  submitForReview: boolean
  activate: boolean
  pullStatus: boolean
  pullSpend: boolean
  pullPerformance: boolean
  pullPolicyIssues: boolean
  edit: {
    budget: 'NONE' | 'IN_PLACE' | 'RECREATE'
    schedule: 'NONE' | 'IN_PLACE' | 'RECREATE'
    targeting: 'NONE' | 'IN_PLACE' | 'RECREATE'
    creative: 'NONE' | 'IN_PLACE' | 'RECREATE'
    destination: 'NONE' | 'IN_PLACE' | 'RECREATE'
  }
  pause: boolean
  resume: boolean
  end: boolean
  links: {
    localPreview: boolean
    providerPreview: boolean
    publicPermalink: boolean
    manager: boolean
  }
}
```

The UI branches on returned capability and field policy, never on platform-name conditionals.

## 18. Delivery plan

### Phase 0 — Make today's confirmation truthful

- Rename `AdBuyReview` product copy to media-order review.
- Display connected account name/id, currency, and account timezone.
- Add Goal and success event even if Meta initially supports only one mapped pair.
- Replace free-text location that is not sent with the real default-country targeting or block unsupported targeting claims.
- Show exact start/end instants, timezone, and explicit no-end choice.
- Separate daily budget from derived estimated maximum and financial authorization.
- Freeze selected media ids and destination version in the order snapshot.
- Keep **Send paused draft to Facebook** as the action.

**Exit:** every field shown as part of the order is either sent, explicitly labeled LOOPIE-only, or labeled as requiring completion in Ads Manager.

### Phase 1 — Versioned order and approval foundation

- Add AdvertisementVersion, MediaOrder, MediaOrderRevision, Approval, account snapshot, and placement creative snapshots.
- Add typed Goal, conversion, targeting, schedule, and budget contracts.
- Implement authorization sentence and expandable seven-row review.
- Add validation snapshot, permissions, amount-based approval, and idempotent submission attempts.
- Link resulting Ad Runs to the exact revision.

**Exit:** the order is a durable auditable authorization, not loose JSON attached to an Ad Run.

### Phase 2 — Status/spend sync and Activity

- Implement provider status, review/policy, spend, and performance pulls.
- Separate provider state, LOOPIE state, and sync health.
- Reconcile requested versus effective configuration and reported versus settled spend.
- Emit Activity transitions and actionable failures.
- Add stale-sync handling, retry/backoff, webhook verification where available, and polling SLAs.

**Exit:** LOOPIE can reliably answer what is running, what changed, what was spent, and what needs attention.

### Phase 3 — Safe remote operations

- Add pause, resume, end, budget, schedule, and supported edit commands.
- Implement request → provider confirmation state rather than optimistic local mutation.
- Add reapproval rules, recreate semantics, rollback limitations, and drift resolution.
- Add threshold monitoring.

**Exit:** authorized users can safely operate spend from LOOPIE without losing provider truth.

### Phase 4 — Targeting presets, estimates, and decision support

- Add provider targeting schema and saved presets with frozen resolution.
- Add provider-returned estimates and freshness.
- Add placement/variant comparisons and LOOPIE-versus-provider attribution views.
- Add evidence-based alerts and decision guidance.

**Exit:** users can prepare repeatable buys and decide where money should move next.

## 19. Acceptance criteria for the first designed screen

The design is ready for implementation when:

- the authorization sentence is always generated from typed data;
- Goal and success event are visible together;
- the exact platform account and paying identity are visible;
- Audience summary matches the provider targeting payload;
- every placement names its frozen creative variant;
- destination and conversion event are explicit;
- schedule includes time, timezone, and no-end semantics;
- budget kind, currency, planned amount, and authorization are distinct;
- provider estimates include source and freshness;
- warnings distinguish blocking errors from acknowledged limitations;
- source-of-truth behavior is inspectable before submission;
- the final button accurately describes spend and provider behavior;
- the approved/submitted revision is immutable and addressable;
- the resulting Ad Run points back to that revision;
- submission is idempotent;
- the screen is keyboard accessible, works on mobile, and preserves draft state through account setup.

## 20. Decisions this proposal makes

- The confirmation is a media order and spend-authorization boundary, not a cosmetic preview modal.
- Advertisement, MediaOrderRevision, AdRun, and PlacementExecution are distinct concepts.
- Goal and success event are separate but mapped together.
- One Ad Run represents one provider budget/targeting/optimization/schedule/lifecycle unit; placements may be children.
- Every external submission is versioned and immutable.
- Requested configuration, effective provider configuration, and source-of-truth ownership are visible.
- Platform review, platform delivery, LOOPIE order state, and sync health remain separate.
- Budget planning, authorization, provider reporting, settlement, and ledger accounting remain separate.
- LOOPIE and platform attribution remain separate and comparable.
- Provider estimates are attributed, timestamped, expiring evidence—not LOOPIE promises.
- Current Meta behavior remains safe: send a paused draft and do not imply spend has started.
- Status/spend/performance sync is the next operational priority immediately after the order contract.

## 21. Open decisions

1. Is the first MediaOrder limited to one platform account, or may one approval cover several accounts/platforms?
2. Which Goal/success-event pair is the first fully supported path: Get Leads → Lead created?
3. Does LOOPIE authorize platform-direct spend, reserve client ledger funds, or support both per account?
4. What amount/change thresholds require reapproval?
5. Which fields may Meta update in place in the first remote-edit release?
6. What sync freshness SLA defines Current for status, spend, and performance?
7. Which events qualify as a provider/LOOPIE attribution match?
8. Does publishing a new Landing Page version require explicit destination revision for every live order?
9. Which restricted-ad categories and jurisdictions are supported at launch?
10. When provider automatic placements are enabled, what minimum placement-level data must LOOPIE preserve for comparison?

Safe initial defaults are: one platform account per MediaOrder; Get Leads → Lead created; paused-draft submission only; any budget, targeting, creative, destination, Goal, or account change invalidates approval; no optimistic live status; and provider data is stale unless sync freshness is verifiable.
