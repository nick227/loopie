# LOOPIE

LOOPIE is Midnight Creative’s **Creative to Close** operating system: prepare advertisements for multiple placements, publish owned conversion surfaces, communicate with customers, unify identity and activity across CRM and commerce systems, and connect the first acquisition touch to downstream revenue.

```text
Advertisement → Platform Run → click/session → Page/Form ─┐
CRM/commerce sync → external identity/event ───────────────┼→ Contact → Lead → Sale
Message, affiliate, import, or manual entry ───────────────┘
```

The same attribution spine survives hosted pages, publisher embeds, exported HTML, LOOPIE forms, imported identities, and external purchase events. Acquisition can happen in many systems; LOOPIE resolves the person once and keeps the path to revenue intact.

## Core Features

- **Advertisements and Platform Runs:** Build an advertisement once, validate its real media for each placement, provision supported platforms idempotently, and manage paid or LOOPIE-owned runs as one portfolio.
- **Pages, forms, and first-party inventory:** Use Pages as owned destinations, lead-capture experiences, tracked publishing surfaces, and inventory for first-party advertising—hosted by LOOPIE, embedded on third-party sites, or exported as portable HTML.
- **River and public business profiles:** Publish native posts, advertisements, and Pages to LOOPIE's public cross-business feed; follow businesses, react to posts, and maintain a public profile with contact details, gallery media, and featured content.
- **Owned communication and live audiences:** Target live customer-graph segments, compose email/text and social drafts, record communication on the shared timeline, and trigger follow-up from lifecycle events.
- **Operational customer data hub:** Resolve one person across LOOPIE, HubSpot, Shopify, WooCommerce, CSV, and connector-ready systems while preserving external identity, provenance, ambiguity, activity, and revenue context.
- **Cross-system attribution and revenue:** Carry first-touch UTMs, click IDs, Platform Run, page, and affiliate context through identity resolution, CRM imports, external commerce events, Leads, and Sales.
- **Acquisition finance and partner revenue:** Maintain append-only client-fund and acquisition accounting alongside SaaS billing, referral policy, frozen commissions, and payout state.

## What’s in V1

### Advertisements & Platform Runs

The persistent primary navigation is **Home · Pages · Advertising · CRM**, with River in the trailing action cluster. Messages, Activity, Media, integrations, and other working surfaces remain available contextually; Affiliates and Billing are ADMIN-only. Advertisement detail is **Overview → Media → Runs → Performance**.

- **Media** are the reusable source materials (images, video, audio, text, logo).
- **Advertisements** are the primary product objects you create and preview. They hold media assets and define the conceptual ad.
- Publishing an Advertisement creates an immutable `PublishedAdvertisementVersion`. That version can be shared to River or assigned to a publisher embed without allowing later draft edits to rewrite what was distributed.
- **Platform Runs** (internally `AdRun`s) describe where and how the advertisement runs, such as Meta Feed, Meta Reels, TikTok Feed, or a LOOPIE Page.
- `PLATFORM_CAPABILITIES` is the canonical placement registry shared by API and UI validation. It defines supported media, recommended aspect ratios, copy limits, and destination requirements instead of leaving those rules in form components.
- Preview aspect ratio and framing react to the selected placement and use the advertisement's real media. `LOOPIE_PAGE` is a first-party placement target, not merely a legacy `AdUnit` concept.
- Creating a run is declarative and idempotent: validate → create or reuse the `AdRun` → push through a configured connector → store external IDs, status, `managerUrl`, and `previewUrl`. Retries reuse the same row and idempotency key.
- Failures are distinguished as `VALIDATION_FAILED` or `PROVISIONING_FAILED`; connector failures persist `errorMessage`, and a failed run never appears live. `managerUrl` opens the platform console while `previewUrl` opens the actual provisioned ad.
- Meta supports connector-backed paused-draft provisioning when the platform and business connection are configured. Google and TikTok currently use real `AdRun` rows with manual status/spend entry.
- Advertisement-level controls derive Off/Mixed/On behavior from child runs, and performance rolls up spend, views, clicks, leads, sales, revenue, and cost per lead across those runs.
- LOOPIE first-party inventory is served by `apps/ad-server` through `/serve`, `/embed`, `/impression`, and `/click`.
- **Budget** funds a client ad wallet, authorizes AdRun budget, and records platform spend through a double-entry ledger. Planning `AdRun.budget` is operational; authorized / reserved / reported / settled / available are derived from ledger entries.
- **Leads and Sales** sourced from a Platform Run are outcomes on the shared customer graph, not run-owned duplicates.

Legacy `Campaign`, `Deployment`, and `AdUnit` structures remain for compatibility and historical finance. Orphaned financial rows tied to legacy campaigns must not be deleted; they preserve the immutable ledger from before the Advertisement/AdRun migration.

### Media system

- Media is a shared asset library for images, video, audio, text, and logos rather than files owned by a single advertisement or page.
- Assets retain reusable metadata such as type, dimensions, duration, size, and compatible placements. Contextual pickers let authors search, filter, upload, and select the right asset without leaving the advertisement or page workflow.
- Advertisements and Pages use the shared library today. Reuse across Messages and Forms is product direction, so those surfaces can eventually reference the same governed asset instead of creating copies.

### Real ad server service

`apps/ad-server` is a real, independently deployable Fastify service for LOOPIE's first-party ad inventory. It is not a mock, a thin alias for `apps/server`, or part of the account-facing OpenAPI. It shares the canonical MySQL database with the main server, while keeping the public, latency-sensitive delivery path independently scalable and deployable.

- `GET /serve/:adUnitId` returns a JSON creative payload for custom renderers. The payload includes the creative assets plus separate impression and click URLs; fetching it does not itself count an impression.
- `GET /embed/:adUnitId?sid=...` returns self-contained HTML for an `<iframe>`, records the impression, and carries the visitor session into the click URL.
- `GET /impression/:adUnitId` records an impression as an atomic `AdUnit` counter increment and returns `204`. Impressions are intentionally not stored as one database row per view.
- `GET /click/:adUnitId?sid=...&click_id=...` increments the click counter, records an `AttributionEvent`, preserves or creates the signed visitor session, and redirects to the assigned landing page, the ad unit URL, or the campaign URL (in that order).
- Only `ACTIVE` ad units on campaigns that have not ended can serve or record traffic. Public tracking responses use `Cache-Control: no-store`, and DB-backed rate limits work across multiple service instances.
- The routes are intentionally public and allow cross-origin embedding. Campaign management, ad-unit creation and activation, creative editing, landing pages, forms, contacts, and reporting remain in `apps/server`.

The service also hosts the versioned publisher runtime:

- `GET /v1.js` discovers `.loopie-embed` containers, authorizes their current origin, mounts the iframe, and coordinates visibility and resize messages.
- `POST /v1/embeds/{publicId}/authorize` enforces the deployment's `ANY` or `ALLOWLIST` domain policy and issues a five-minute, single-use nonce; `GET /e/{publicId}` redeems it and creates an `EmbedInstance` tied to the immutable published snapshot.
- `/v1/embed-events`, `/v1/embed/{publicId}/click`, and `/v1/embed/{publicId}/submit` persist embed activity; impressions are idempotent per embed instance. Advertisement clicks write attribution synchronously, while a retrying worker projects embedded form submissions into the canonical CRM/activity graph.
- Page embeds render the shared published-page snapshot and support forms. Advertisement deployment, authorization, impression, click, and attribution are wired, but the current advertisement iframe still renders placeholder creative; token redemption also remains folded into iframe rendering rather than implemented by the reserved `/v1/embed-instances/redeem` endpoint.

Run it locally with `pnpm --filter ad-server dev` (default port `3002`). It requires the shared `DATABASE_URL`; `PRIMARY_APP_URL` builds hosted landing-page and media URLs, while `AD_SERVER_URL` builds the public tracking URLs returned by `/serve`. In Railway, deploy it as a second service using `apps/ad-server/railway.json`, connect it to the same MySQL service, and set both public URLs to their deployed origins. See [`apps/ad-server/README.md`](./apps/ad-server/README.md) for the route and deployment reference.

### Pages, forms, and tracking runtime

Pages combine four roles in one owned surface: destination, lead capture, first-party ad inventory, and attribution runtime.

- Structured canvas authoring, not unrestricted HTML: `LandingPageTemplate → LandingPage` (draft) → `PublishedPageVersion` (immutable). The current system starters are Corporate Professional, Studio, and Webinar Signup, plus Blank.
- Hosted at `/p/{slug}`, HTML export, draft/publish lifecycle.
- Published Pages can also be embedded on third-party sites. An idempotent deployment keeps a stable public ID while republishing moves it to the latest immutable version; `ANY` and origin-allowlist policies are supported.
- Forms are first-class reusable entities. Submitting a form is the identity transition: anonymous session → Contact → Lead, keeping AdRun / Deployment / AdUnit / UTM attribution.
- Publishing freezes form fields, submit label, and success copy into the page version. Editing the live Form later does not change an already-published page. Soft-deleting a Form still stops serve/submit everywhere immediately.
- Hosted and exported pages use the same portable `/loopie.js` runtime. `GET /t/session` mints or reuses a signed, tenant-bound session and persists the first touch rather than overwriting it on later visits.
- Sessions preserve UTMs, the source AdRun, `click_id`, and platform click IDs such as `gclid`, `fbclid`, and `ttclid`. Tokens are scoped by HMAC and resolved by `(id, businessId)` so a session from one tenant cannot expose or claim another tenant's attribution.
- When an imported CRM identity or external order later resolves to that person, the canonical Contact connects the acquisition history to the downstream customer activity and revenue instead of starting a disconnected record.
- Hosted, exported, and embedded Pages share `@project/page-renderer`, preventing the server and ad-server render paths from drifting. Embedded form submissions are projected asynchronously into Contacts, Leads, and Activity through the worker outbox.

### River and public business profiles

River is LOOPIE's first-party public discovery and organic publishing surface. `GET /river` serves the public feed, while the authenticated SPA adds composing and engagement controls.

- Businesses can publish text posts with image galleries, video, links, previews, and calls to action; published Advertisements and Pages can also be shared without copying their mutable drafts.
- The feed is reverse chronological, supports cursor pagination and a following-only view, limits long same-business streaks, and inserts clearly labeled sponsored Advertisement posts at a fixed cadence. It is intentionally deterministic rather than algorithmically ranked.
- Authenticated businesses can react, follow/unfollow, delete their own posts, and pin one post as Featured. Click-through and profile-visit events are tracked; anonymous visitors can browse but cannot engage.
- Every business receives a stable public slug at `/b/{slug}`. The profile combines identity, description, contact details, hours, social links, gallery media, follower count, a Featured post, and that business's latest River posts.
- Business identity is completed during first-login setup and remains editable inline from Home. Older rows can be assigned slugs with `apps/server/scripts/backfillBusinessSlugs.ts`.

### Messaging, audiences, and automations

- Messaging is the owned-communication side of the customer graph: select an audience, reuse a template, compose email or text, and retain follow-up activity on the Contact timeline. Posts for external social networks are **compose/draft only**—River publishing is the separate live first-party path.
- Email delivery uses Resend in batches of 50 when `RESEND_API_KEY` is configured. Without it, the send is recorded but no email leaves the system. SMS still records only; delivery/open/click/unsubscribe webhooks and the test-send transport are not wired.
- Audiences can be manual lists, imported lists, saved filters, or live predefined queries. Examples include recent customers, ad-sourced Leads who never bought, Shopify-linked people, customers, open Leads, no-response Contacts, and recently contacted people.
- Because derived audiences query the canonical graph, a Sale reversal, provider link, new Lead, purchase, or eligibility change can affect membership without copying the person into another silo.
- Automations are `Trigger → Wait → Condition → Action`. They **run**: a scheduler creates internal `AutomationRun` rows; a poller evaluates due runs. The user-visible history is `AutomationLog` (`GET /automations/{id}/logs`).
- Wired triggers: `LEAD_CREATED`, `MESSAGE_SENT`, `LEAD_STATUS_CHANGED`, `SALE_RECORDED`. **Not wired:** `CONTACT_REPLIES` (no inbound reply webhook) and `DATE_REACHED` (under-specified). Those rules can be saved and paused; they never fire.
- The UI shows trigger, action, Active/Paused, last run, and logs as **Executed / Skipped / Failed**, including the skip/fail reason when the log has one. Internal `AutomationRun` is not an API.

### Customer data hub and CRM

CRM is LOOPIE's operational data hub, not a separate contact book. It consolidates acquisition, communication, provider identity, customer activity, pipeline state, purchases, and revenue around one person while retaining where every external fact came from.

- A person has one canonical `Contact`. HubSpot, Salesforce, Shopify, WooCommerce, Square, Pipedrive, and CSV records hang off that Contact as external records with provider identity, raw provenance, and match state.
- Identity resolution checks scoped external ID, then normalized email, then phone. Conflicting identifiers become an ambiguous match for human resolution; LOOPIE never guesses across people.
- Existing Contacts are enriched without overwriting authoritative populated fields. Primary identifiers and external record provenance retain where customer data came from.
- The CRM surface combines **People · Import · Integrations**; **Matches** appears only when unresolved conflicts exist. Contacts support inline create/edit, avatar media, reusable colored tag catalogs and AND/OR tag filtering, pinned or editable notes, Sale history, and a cross-system activity timeline.
- Contact detail includes the current Lead card, next-action scheduling, and manually logged calls, meetings, webinars/events, follow-ups, and notes. Activities use a stable Channel → Provider → Activity taxonomy, with a per-business provider catalog for tools such as Zoom or Mailchimp.
- The open-Lead work queue groups records into New, Never contacted, Needs follow-up, Overdue, and Engaged buckets. CRM insights calculate time to first contact, contact-within targets, touches before engagement/win, channel mix, overdue follow-up rate, and stage conversion.
- CSV/JSON import maps common provider fields, stores unknown fields as profile data, and links unique conflicts to an existing Contact instead of skipping the person. Import jobs report created, linked, ambiguous, and skipped outcomes.
- HubSpot contact and closed-won deal sync is live. Shopify customer and order sync is live. WooCommerce registered customers, guest billing identities, and completed/processing orders are live behind a read-only-key import preview. Sync is incremental, idempotent, resumable, and failure-aware: cursors persist after every processed page, jobs end as completed or failed, duplicate external deliveries reuse the existing event/Sale, and retries continue from durable progress.
- A generic inbound webhook integration is live. LOOPIE generates a bearer secret and tenant-specific endpoint, then idempotently ingests contact, order, payment, deal, or other external events through the same identity and Sale materialization path.
- Salesforce, Square, and Pipedrive are catalog roadmap entries and appear as Coming soon rather than connectable integrations.
- `DEAL_WON`, `ORDER_CREATED`, and `PAYMENT_COMPLETED` events can idempotently materialize a Sale and attach it to the attributed open Lead when one exists.
- The shared pipeline is `NEW → CONTACTED → ENGAGED → QUALIFIED → PROPOSAL → WON/LOST`, with one Interaction timeline and acquisition context across messages, runs, first-party ads, affiliates, imports, and manual entry.

### Sale integrity

- Sale creation is idempotent per business and excludes reversed Sales from revenue, lifecycle, audience, and performance calculations.
- A Sale can close only a compatible Lead created before the Sale. Repeat purchases use a new Lead or a standalone Sale rather than reopening historical acquisition credit.
- Reversal is concurrency-safe and creates compensating finance/commission entries; posted history is never mutated.

### Home

Home is LOOPIE's unifying operational surface: a high-level answer to what changed, what needs attention, and where the business should act next. It monitors the customer graph, communication, acquisition, revenue, advertisements, and integrations without forcing the user to reconstruct business state from separate product areas.

```text
INBOX · REACH · RESPONSE · SPEND · LEADS · REVENUE
```

The signal rail gives the immediate business pulse. Below it, activity and attention surfaces bring together:

- customer actions such as replies and form submissions;
- new Leads, Sales, and revenue-producing external events;
- Advertisement and Platform Run state, including provisioning failures;
- connector failures, unresolved identity matches, and other system issues;
- meaningful “what changed” summaries rather than a stream of low-value telemetry.

Routine clicks remain in analytics. Home promotes events only when they change business state, explain an outcome, or require action.

### Activity command center

The dedicated Activity surface is the inspectable operational history behind Home. Projectors normalize meaningful Website, LOOPIE, Platform, and Automation events without blocking the originating business transaction when projection fails.

- The API can filter the cursor-paginated stream by source, type, related person/ad/page, status, or whether action is required; the current UI exposes source and Needs Action and can save filter sets as named views.
- The inspector links to related records and lets operators resolve or snooze an `AttentionItem`; the API also supports assignment and priority. A lightweight checkpoint supports manual new-item refresh.
- Projection failures are stored durably and exposed through the Activity health endpoint instead of silently disappearing.

### Product UI system

The frontend is converging on a reusable product system: semantic color and typography tokens, consistent interaction states, shared headers, contextual search/filter controls, and reusable media and list primitives. Home is an intentional flagship monitoring layout; ordinary product surfaces keep the shared system instead of copying dashboard-specific presentation.

### Money & Stripe

LOOPIE treats acquisition money as accounting data, not editable counters. `FinanceService` owns an append-only, double-entry ledger for client funds, run authorization, spend, fees, credits, refunds, revenue, commissions, transfers, and reversals; balances are derived from posted history.

| Path                  | What it is                                                                                                                                                                                                                                                                   | What it is not                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **LOOPIE billing**    | Stripe Checkout + Customer Portal for the LOOPIE subscription. Posts `PROCESSOR_CLEARING` / `LOOPIE_REVENUE`. UI shows plan name, plain-language status, and `?checkout=success\|cancel`. If Stripe env is unset, `GET /billing` still returns 200 with `configured: false`. | Not ad spend. Never credits `CLIENT_AD_FUNDS`.                                                 |
| **Client ad funds**   | Double-entry ledger (`FinanceService` is the only writer). Wallet deposits, run authorization, platform spend, fees, credits, and refunds. Balances are derived; old entries are never edited.                                                                               | Not charged through Stripe in V1. Funding is recorded, not pulled from a card.                 |
| **Affiliate payouts** | Commissions from frozen sale splits → payable queue. Connect Express onboarding. Connect-ready pay: `PAYABLE` → **Sending** (`PENDING`) → Stripe **Transfer** → **Transferred** (ledger posts here) → connected-account bank payout → **Paid**.                              | **Transferred** does not mean the money arrived at the bank. Manual payees still jump to Paid. |

### Partner and referral revenue

Affiliates form a complete referral-revenue subsystem rather than a link-tracking add-on.

- Referral link/code → tracked session (`GET /r/affiliate/{affiliateId}`) → Contact/Lead → Sale → Commission → Payout.
- Policy lives on **class → deal** (percentage or fixed, cap, eligibility window from the actual click, payout cadence/threshold, manager share). Assignment + optional rate overrides. A sale freezes `SaleAffiliateSplit`; changing a deal later does not rewrite history. Manager share is a split of gross, not extra cost.
- ADMIN tools: directory, destination, payable queue (Payable / Sending / Transferred / Paid / Failed), class/deal assignment.
- Affiliates get a small portal (home, team, payouts) — not an agency/multi-account layer.

---

## Not in V1

- Full Google Ads and TikTok Ads provisioning/status/spend sync. Meta activation and ongoing status/spend sync. Live publishing to external social networks (River publishing is live).
- Unified omnichannel inbox, native quotes/invoices, and live card custody for client ad funds.
- Branching visual automation builder, sequences longer than two steps, and the unwired `CONTACT_REPLIES` / `DATE_REACHED` triggers.
- A/B/n statistical testing, members-only communities, cross-advertising portals, automated budget pacing.
- Agency / white-label / multi-account. Drag-and-drop landing-page builder. Custom-domain DNS/cert provisioning.
- Live Salesforce, Square, Pipedrive, or Zapier-style sync.
- Calendar/scheduling integrations and personal-assistant reminders.

- **Knowledge Base Auto-Responder:** an AI bot that answers inbound text messages or emails strictly from a provided proprietary dataset.
- **Human-Driven Content Generation:** AI-assisted blog content directed, edited, and curated by human strategy.

These are roadmap items, not claims about currently active behavior.

---

## Current integration status

| Status                     | Integrations                                                                                                                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live**                   | HubSpot contacts + closed-won deals; Shopify customers + orders; WooCommerce customers + orders; generic inbound webhook; Resend email when configured; LOOPIE Ad Server and publisher Page embeds; River; Meta paused-draft pushes when configured |
| **Manual**                 | Google Ads and TikTok Platform Runs; SMS send records; external social drafts; client ad-fund deposits; connectorless metrics/status                                                                                                                |
| **Catalog / roadmap only** | Salesforce, Square, and Pipedrive                                                                                                                                                                                                                   |
| **Planned**                | The broader platform and channel roadmap below                                                                                                                                                                                                      |

---

## Architecture

```text
pnpm workspace
  apps/server      Fastify, contract-first OpenAPI 3.0.3, Prisma + MySQL
  apps/ad-server   Fastify, public first-party ad serving and publisher embed runtime
  apps/web         Vite + React + Tailwind SPA
  packages/db      Prisma schema + shared DB helpers (content, sessions, rate limit, …)
  packages/api-spec  Canonical openapi.yaml
  packages/embed-contract  Canonical embed payloads, hashes, origins, and browser protocol
  packages/page-renderer   Shared landing-page HTML renderer and form snapshots
  packages/sdk     Generated types + React Query hooks (openapi-fetch)
```

- `FinanceService` is the only writer of ledger rows. Reverse with a new `REVERSAL`; never mutate posted entries.
- Public attribution obeys a tenant-isolation invariant: scoped HMAC `sid` tokens are accepted only with tenant-scoped `(id, businessId)` storage lookups. Possessing a valid token from one business cannot expose or claim another business's session. Rate limits are DB-backed (`RateLimitBucket`) so they work across processes.
- `Contact` is the canonical person; `ContactIdentifier`, `ExternalContactRecord`, `ExternalEvent`, and `ImportJob` preserve cross-system identity, provenance, and sync state around it.
- `compareSourcePair()` and `apps/server/scripts/shadow-compare.ts` prove structural parity between legacy `Deployment`/`AdUnit` data and `AdRun` before reads and writes cut over. This allows the product model to migrate without rewriting or discarding historical finance; structural differences are reported instead of silently accepted.
- Shared semantic tokens and reusable page-header/search/filter primitives form the default design system. Home is an intentional operational-dashboard exception rather than a template for every list page.
- Both services ship with `Dockerfile` + `railway.json`. Production start uses `tsx` (plain `node dist/` cannot load `@project/db` TypeScript).

### Contract-first workflow

1. Model in `packages/db/prisma/schema.prisma` → `pnpm db:push`
2. Routes and schemas in `packages/api-spec/openapi.yaml`
3. Handler + service in `apps/server`
4. `pnpm sdk:generate`
5. Pages in `apps/web` consume the typed hooks

Do not destructure `{ data, error, response }` off an awaited SDK call or narrow on `error` inside `if` — TS 5.9 + openapi-fetch collapses inference to `never`.

---

## Local development

```bash
pnpm install
# copy/edit the root environment file; app dev scripts load it directly
cp .env.example .env
# Prisma runs from packages/db, so export the same URL before DB commands
export DATABASE_URL='mysql://root:password@localhost:3306/loopie_dev'
pnpm db:push
pnpm db:seed
pnpm dev # API + worker, ad/embed server, and web app
```

For isolated work, run `pnpm --filter server dev`, `pnpm --filter ad-server dev`, and `pnpm --filter web dev` in separate terminals. Their default ports are `3001`, `3002`, and `5173`; the API exposes OpenAPI UI at `/docs`.

Media uploads use local disk by default; in production, configure a durable `UPLOAD_DIR`. The optional R2 variables add an object-storage delivery overlay while retaining the local copy as fallback.

### Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm sdk:check
pnpm --filter web test:e2e # requires the three dev services to be running
```

### Seed accounts

`pnpm db:seed` is idempotent. Password for every login: **`password123`**.

| Email                         | Role      | Tenant     | What it’s for                                               |
| ----------------------------- | --------- | ---------- | ----------------------------------------------------------- |
| `demo@loopie.app`             | ADMIN     | Riverside  | Owner — advertisements, affiliates, billing (e2e uses this) |
| `shop@loopie.app`             | USER      | Riverside  | Staff — Home, CRM, Messages, Advertisements, Pages, Media   |
| `marketer@loopie.app`         | USER      | Riverside  | Second staff login                                          |
| `suspended@loopie.app`        | USER      | Riverside  | Login returns **403**                                       |
| `affiliate@loopie.app`        | AFFILIATE | Riverside  | Jordan — independent field rep                              |
| `manager@loopie.app`          | AFFILIATE | Riverside  | Casey — has a downline                                      |
| `downline@loopie.app`         | AFFILIATE | Riverside  | Riley — reports to Casey                                    |
| `paused-affiliate@loopie.app` | AFFILIATE | Riverside  | Taylor — paused                                             |
| `oak@loopie.app`              | ADMIN     | Oak Street | Second-tenant owner                                         |
| `oak-shop@loopie.app`         | USER      | Oak Street | Second-tenant staff                                         |
| `oak-affiliate@loopie.app`    | AFFILIATE | Oak Street | Sam — other-tenant affiliate                                |

Maya (`maya25`) is an affiliate **without** a login (flat $25 deal), so the admin directory is not only portal users. Riverside demo data is unchanged (Jane, campaign, `/p/raw-customer-stories`, form, ad unit). Affiliate deals include Standard 10, Weekly 8, and Flat 25.

Vitest has its own throwaway users (`alice@test.local` ADMIN, `shop@test.local` USER, `bob@test.local` on a second business) in `apps/server/src/__tests__/helpers`. Those are wiped every test and are not for clicking around in the app.

- `apps/server` and `apps/ad-server` load the root `.env` in development. Production `start` commands expect the deployment environment to provide variables.
- Tests never use whatever `DATABASE_URL` happens to be in the shell. `pnpm --filter server test` / `pnpm --filter ad-server test` default to a dedicated `loopie_test` database. Do not point that suite at the shared `loopie` DB — the suite wipes tables.
- On a shared machine, check what is actually bound to a port before assuming it is LOOPIE. This repo’s Playwright runs have collided with other projects on **3001**.

---

## Docs

- [Architecture](./docs/architecture) — data model, IA, design rules
- [Features](./docs/features) — advertisements, Platform Runs, pages/forms, messaging, automations, customer graph, attribution, finance, and affiliates
- [Operations](./docs/operations) — how the service is run day to day
- [Strategy](./docs/strategy) — vision and roadmap (treat “phase 1 in scope” there as direction; this README is what V1 actually does)
- [Sales & marketing](./docs/sales-marketing)

---

## Future platform and integration roadmap

This is the broad integration universe, not a claim that these connectors are live or a commitment to build every one. A connector may support one or more capabilities: paid campaign deployment, organic publishing, messaging, lead ingestion, conversion upload, commerce sync, or reporting. Actual scope depends on platform API access, review requirements, account tier, geography, and commercial priority.

- **First-party advertising**
  - LOOPIE Ad Server
  - A LOOPIE WordPress publisher plugin for registering sites and inserting managed ad slots
  - Native embed-management apps for Webflow, Shopify, Ghost, Wix, and other CMSs on top of the existing generic publisher runtime
  - Sponsored placements and house ads
  - Partner and affiliate inventory
- **Search, display, and video advertising**
  - Google Ads: Search, Display, Shopping, Performance Max, and Demand Gen
  - YouTube Ads
  - Microsoft Advertising
  - Google Display & Video 360
  - The Trade Desk, StackAdapt, AdRoll, and Criteo
- **Social advertising**
  - Meta Ads: Facebook, Instagram, Messenger, and Audience Network
  - LinkedIn Ads
  - TikTok Ads
  - Reddit Ads
  - Pinterest Ads
  - Snapchat Ads
  - X Ads
  - Threads, when an ads API is available
  - Quora Ads
  - Nextdoor Ads
- **Retail and marketplace advertising**
  - Amazon Ads
  - Walmart Connect
  - Instacart Ads
  - eBay Promoted Listings
  - Etsy Ads
  - Target Roundel
  - Kroger Precision Marketing
- **Mobile-app advertising**
  - Apple Ads
  - Google App campaigns
  - Meta app ads
  - TikTok app promotion
  - AppLovin, Unity Ads, ironSource, and Moloco
- **Native, audio, and connected-TV advertising**
  - Taboola, Outbrain, and Teads for native and premium-publisher inventory
  - Spotify Ads
  - Amazon DSP
  - Roku Ads
  - Hulu/Disney and Peacock advertising
  - Twitch Ads
  - Podcast ad networks and host-read sponsorship inventory
- **Blogs, newsletters, and curated publisher marketplaces**
  - BuySellAds for websites, newsletters, podcasts, native ads, and sponsored content
  - Carbon Ads and EthicalAds for contextual developer and technology inventory
  - Paved and direct newsletter sponsorship marketplaces
  - Publisher media kits, sponsored articles, and direct insertion-order campaigns
  - Contextual packages organized by topic, audience, geography, or publication
- **Programmatic exchanges and publisher deals**
  - Open-web inventory through DSPs such as The Trade Desk, StackAdapt, Display & Video 360, Amazon DSP, Basis, Yahoo DSP, and Adform
  - Open auctions and curated publisher packages
  - Private Marketplace (PMP) deals and private auctions
  - Preferred Deals with negotiated first access to inventory
  - Programmatic Guaranteed deals with reserved inventory
  - Direct publisher agreements activated through DSP deal IDs
  - Supply paths through publisher ad servers, exchanges, and SSPs such as Google Ad Manager, Magnite, PubMatic, Index Exchange, and OpenX
- **Local, travel, and service advertising**
  - Google Local Services Ads and Google Business Profile
  - Yelp Ads
  - Nextdoor Business
  - Apple Business Connect
  - Bing Places
  - Tripadvisor
  - Angi, Thumbtack, and Houzz
- **Organic social publishing**
  - Facebook Pages and Instagram
  - Threads
  - LinkedIn profiles and company pages
  - TikTok and YouTube
  - X
  - Pinterest and Reddit
  - Snapchat Public Profiles
  - Bluesky, Mastodon, and Tumblr
- **Websites, blogs, and CMS publishing**
  - **WordPress.org and WordPress.com**
  - Webflow, Wix, and Squarespace
  - Ghost, Medium, Substack, and Blogger
  - Drupal and HubSpot CMS
  - Contentful, Sanity, and Strapi
- **Commerce and product publishing**
  - **Shopify** and **WooCommerce**
  - BigCommerce and Adobe Commerce/Magento
  - Squarespace Commerce and Wix eCommerce
  - Amazon Seller Central and Walmart Marketplace
  - eBay and Etsy
- **Email, newsletters, and lifecycle marketing**
  - Mailchimp and Klaviyo
  - HubSpot Marketing Hub and ActiveCampaign
  - Constant Contact, Campaign Monitor, and Brevo
  - Customer.io, Kit, and beehiiv
  - SendGrid, Postmark, Amazon SES, and generic SMTP providers
- **SMS, chat, and community publishing**
  - Twilio, Bird, and Telnyx
  - WhatsApp Business
  - Facebook Messenger and Instagram Direct
  - Telegram
  - Slack, Discord, and Microsoft Teams
- **CRM and lead exchange**
  - Salesforce, HubSpot CRM, and Microsoft Dynamics 365
  - Zoho CRM, Pipedrive, and HighLevel
  - Keap, Freshsales, Copper, and Close
  - Airtable
- **Payments, orders, and revenue attribution**
  - Stripe, Square, and PayPal
  - Shopify Payments and WooCommerce order data
  - QuickBooks Online and Xero
- **Analytics and conversion measurement**
  - Google Analytics 4, Google Tag Manager, and Google Search Console
  - Meta Pixel and Conversions API
  - TikTok Pixel and Events API
  - LinkedIn Insight Tag and Conversions API
  - Microsoft UET
  - Pinterest Tag and Conversions API
  - Snap Pixel and Conversions API
  - Segment, RudderStack, Mixpanel, Amplitude, and Hotjar
- **Creative and media libraries**
  - Canva, Adobe Creative Cloud/Express, and Figma
  - Google Drive, Dropbox, OneDrive, and Box
  - Cloudinary
- **Forms, scheduling, and events**
  - Typeform, Jotform, and Google Forms
  - Calendly and Cal.com
  - Google Calendar and Microsoft Outlook/Calendar
  - Eventbrite and Zoom Webinars
- **Automation and data movement**
  - Zapier, Make, n8n, and Workato
  - Webhooks and CSV import/export
  - A public LOOPIE API

---
