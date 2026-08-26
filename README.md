# LOOPIE

LOOPIE is Midnight Creative’s **Creative to Close** operating system: one place for a business to run paid campaigns, owned messaging, hosted landing pages, first-party ads, and a shared CRM pipeline, with every lead and sale landing in the same Contact → Lead → Sale spine.

The product direction is the full lifecycle. **V1 is the spine plus the slices below** — not live Meta/Google connectors, not a unified inbox, and not native quoting/invoicing.

## Core loop

1. **Make or upload creative** into a shared asset library.
2. **Create a campaign** (creative, platforms, budget, dates) and deploy — external platforms as `Deployment` records, LOOPIE inventory as `AdUnit`s.
3. **Capture leads** on LOOPIE-hosted landing pages and reusable forms. Anonymous click → form submit → Contact + Lead, with attribution preserved.
4. **Nurture** with email/text (and social drafts), audiences, templates, and source-agnostic automations.
5. **Close** by recording a Sale on the same contact. Affiliate credit, if any, is separate from how the lead was acquired.
6. **Track & iterate** from Home (what needs attention today) and per-surface Performance — not a standalone Reports nav.

---

## What’s in V1

### Campaigns

Top-level nav is **Home · Campaigns · Messages** (Affiliates is ADMIN-only). Campaign detail is **Overview → Budget → Creatives → Ad Units → Leads**.

- Campaigns hold creatives, platforms, planning budget, and dates.
- **Meta / Google / TikTok** are real `Deployment` rows. V1 does **not** call those platform APIs. Status and spend are entered manually (`PATCH /deployments/{id}`).
- **LOOPIE** as a platform creates first-party `AdUnit`s, served by `apps/ad-server` (`/serve`, `/embed`, `/impression`, `/click`).
- Changing a campaign’s creatives or platforms **reconciles inventory**: dropped combos are `ENDED` (never deleted), new combos are created or revived as drafts/pending.
- **Budget** funds a client ad wallet, authorizes campaign budget, and records platform spend through a double-entry ledger. Planning `Campaign.budget` is operational; authorized / reserved / reported / settled / available are derived from ledger entries.
- **Leads** on a campaign are outcomes (contact, source, stage, value). Click opens Contact timeline, not a campaign-specific lead editor.

### Landing pages & forms

- Template-driven authoring, not a freeform builder: `LandingPageTemplate → LandingPage` (draft) → `PublishedPageVersion` (immutable).
- Hosted at `/p/{slug}`, HTML export, draft/publish lifecycle.
- Forms are first-class reusable entities. Submitting a form is the identity transition: anonymous session → Contact → Lead, keeping Deployment / AdUnit / UTM attribution.
- Publishing freezes form fields, submit label, and success copy into the page version. Editing the live Form later does not change an already-published page. Soft-deleting a Form still stops serve/submit everywhere immediately.

### Messaging & automations

- Contacts, audiences, templates, and compose/send for email and text. Social posts are **compose/draft only** — no live publishing.
- Channel delivery plugins (transactional email / SMS) are not installed; a “send” records the same `Interaction` the rest of the app uses.
- Automations are `Trigger → Wait → Condition → Action`. They **run**: a scheduler creates internal `AutomationRun` rows; a poller evaluates due runs. The user-visible history is `AutomationLog` (`GET /automations/{id}/logs`).
- Wired triggers: `LEAD_CREATED`, `MESSAGE_SENT`, `LEAD_STATUS_CHANGED`, `SALE_RECORDED`. **Not wired:** `CONTACT_REPLIES` (no inbound reply webhook) and `DATE_REACHED` (under-specified). Those rules can be saved and paused; they never fire.
- The UI shows trigger, action, Active/Paused, last run, and logs as **Executed / Skipped / Failed**, including the skip/fail reason when the log has one. Internal `AutomationRun` is not an API.

### CRM-lite

One Contact, one Lead pipeline (`NEW → CONTACTED → QUALIFIED → QUOTED → WON/LOST`), one Sale, one Interaction timeline — regardless of whether the source was a message, an external deployment, a LOOPIE ad unit, an affiliate referral, or a manual/import path.

`sourceType` answers “how they arrived.” Affiliate credit is a separate field (`referringAffiliateId`), first-touch only, stamped at genuine lead creation.

### Money & Stripe

Two different money paths. They must not be mixed.

| Path                  | What it is                                                                                                                                                                                                                                                                                             | What it is not                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **LOOPIE billing**    | Stripe Checkout + Customer Portal for the LOOPIE subscription. Posts `PROCESSOR_CLEARING` / `LOOPIE_REVENUE`. UI shows plan name, plain-language status, and `?checkout=success\|cancel`. If Stripe env is unset, `GET /billing` still returns 200 with `configured: false` — no ugly 503 on the page. | Not ad spend. Never credits `CLIENT_AD_FUNDS`.                                                |
| **Client ad funds**   | Double-entry ledger (`FinanceService` is the only writer). Wallet deposit, campaign authorization, platform spend, fees, credits, refunds. Balances are derived; old entries are never edited.                                                                                                         | Not charged through Stripe in V1. Funding is recorded, not pulled from a card.                |
| **Affiliate payouts** | Commissions from frozen sale splits → payable queue. Connect Express onboarding. Connect-ready pay: `PAYABLE` → payout **Sending** (`PENDING`) → Stripe **Transfer** → **Transferred** (ledger posts here) → connected-account bank payout → **Paid**.                                                 | **Transferred is not “arrived at the bank.”** Manual (non-Connect) payees still jump to Paid. |

### Affiliates

- Referral link/code → tracked session (`GET /r/affiliate/{affiliateId}`) → Contact/Lead → Sale → Commission → Payout.
- Policy lives on **class → deal** (percentage or fixed, cap, eligibility window from the actual click, payout cadence/threshold, manager share). Assignment + optional rate overrides. A sale freezes `SaleAffiliateSplit`; changing a deal later does not rewrite history. Manager share is a split of gross, not extra cost.
- ADMIN tools: directory, destination, payable queue (Payable / Sending / Transferred / Paid / Failed), class/deal assignment.
- Affiliates get a small portal (home, team, payouts) — not an agency/multi-account layer.

---

## Not in V1

- Live Meta / Google / TikTok API sync (create, pause, import spend).
- Social publishing to live networks.
- Unified omnichannel inbox, native quotes/invoices, or a live payment processor for client ad custody.
- Branching/visual automation builder, sequences longer than two steps, or the unwired `CONTACT_REPLIES` / `DATE_REACHED` triggers.
- A/B/n statistical testing, members-only communities, cross-advertising portals, automated budget pacing.
- Agency / white-label / multi-account. Drag-and-drop landing-page builder. Custom-domain DNS/cert provisioning.
- Salesforce / HubSpot / Zapier-style CRM sync.

Those belong in product vision and later phases, not in “currently active.”

---

## Architecture

**Acquisition is plural, everything downstream is singular.** Campaigns and Messages are two sources feeding one Contact → Lead → Sale → Interaction model.

```text
pnpm workspace
  apps/server      Fastify, contract-first OpenAPI 3.0.3, Prisma + MySQL
  apps/ad-server   Fastify, public first-party ad serving (not on the OpenAPI contract)
  apps/web         Vite + React + Tailwind SPA
  packages/db      Prisma schema + shared DB helpers (sessions, rate limit, …)
  packages/api-spec  Canonical openapi.yaml
  packages/sdk     Generated types + React Query hooks (openapi-fetch)
```

- `FinanceService` is the only writer of ledger rows. Reverse with a new `REVERSAL`; never mutate posted entries.
- Public capture uses signed visitor sessions (`?sid=`). Rate limits are DB-backed (`RateLimitBucket`) so they work across processes.
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
# set DATABASE_URL (see .env). Prisma CLI loads packages/db/.env; the server does not.
export DATABASE_URL='mysql://…'
pnpm db:push
pnpm db:seed
pnpm --filter server dev    # default PORT=3001; /docs is the OpenAPI UI
pnpm --filter web dev       # Vite, default 5173; VITE_API_URL must match the API
```

### Seed accounts

`pnpm db:seed` is idempotent. Password for every login: **`password123`**.

| Email                         | Role      | Tenant     | What it’s for                                                |
| ----------------------------- | --------- | ---------- | ------------------------------------------------------------ |
| `demo@loopie.app`             | ADMIN     | Riverside  | Owner — campaigns, affiliates, billing (e2e still uses this) |
| `shop@loopie.app`             | USER      | Riverside  | Staff — Home / Campaigns / Messages only                     |
| `marketer@loopie.app`         | USER      | Riverside  | Second staff login                                           |
| `suspended@loopie.app`        | USER      | Riverside  | Login returns **403**                                        |
| `affiliate@loopie.app`        | AFFILIATE | Riverside  | Jordan — independent field rep                               |
| `manager@loopie.app`          | AFFILIATE | Riverside  | Casey — has a downline                                       |
| `downline@loopie.app`         | AFFILIATE | Riverside  | Riley — reports to Casey                                     |
| `paused-affiliate@loopie.app` | AFFILIATE | Riverside  | Taylor — paused                                              |
| `oak@loopie.app`              | ADMIN     | Oak Street | Second-tenant owner                                          |
| `oak-shop@loopie.app`         | USER      | Oak Street | Second-tenant staff                                          |
| `oak-affiliate@loopie.app`    | AFFILIATE | Oak Street | Sam — other-tenant affiliate                                 |

Maya (`maya25`) is an affiliate **without** a login (flat $25 deal), so the admin directory is not only portal users. Riverside demo data is unchanged (Jane, campaign, `/p/raw-customer-stories`, form, ad unit). Affiliate deals include Standard 10, Weekly 8, and Flat 25.

Vitest has its own throwaway users (`alice@test.local` ADMIN, `shop@test.local` USER, `bob@test.local` on a second business) in `apps/server/src/__tests__/helpers`. Those are wiped every test and are not for clicking around in the app.

- `apps/server`’s `tsx watch` **does not load `.env`**. Export `DATABASE_URL` (and Stripe keys when you want Checkout/Connect) in the shell that starts it.
- Tests never use whatever `DATABASE_URL` happens to be in the shell. `pnpm --filter server test` / `pnpm --filter ad-server test` default to a dedicated `loopie_test` database. Do not point that suite at the shared `loopie` DB — the suite wipes tables.
- On a shared machine, check what is actually bound to a port before assuming it is LOOPIE. This repo’s Playwright runs have collided with other projects on **3001**.

---

## Docs

- [Architecture](./docs/architecture) — data model, IA, design rules
- [Features](./docs/features) — campaigns, creatives, messaging, automations, attribution, CRM-lite
- [Operations](./docs/operations) — how the service is run day to day
- [Strategy](./docs/strategy) — vision and roadmap (treat “phase 1 in scope” there as direction; this README is what V1 actually does)
- [Sales & marketing](./docs/sales-marketing)
