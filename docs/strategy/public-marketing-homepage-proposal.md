# Public Marketing Homepage — Proposal

**Status:** proposal, decisions locked by the user 2026-09-12, not yet implemented. **Author context:** written by auditing the real routing/component code named below — every claim about current behavior is sourced from the file/line cited, not assumed.

## The problem

LOOPIE has no public page that explains what the product is. Today:

- `/` is an authenticated-only route. `apps/web/src/App.tsx`'s index route (`<Route index element={<BusinessDefaultRoute />} />`) sits inside `<AuthGuard/>` → `<Shell/>` → `<RequireNonAffiliate/>`. An anonymous visitor hitting `/` is bounced straight to `/login` by `AuthGuard` (`apps/web/src/lib/AuthGuard.tsx:29`) before any product content ever renders.
- A signed-in user hitting `/` is immediately redirected to `/calendar` (`RequireRole.tsx`'s `BusinessDefaultRoute`/`useBusinessDestination`) — there has never been a "Home" overview at the root; `CLAUDE.md`'s own nav-history notes confirm Home was folded into the private Profile page months ago.
- The only routes an anonymous visitor can reach at all are `/login`, `/register`, `/river` (a live customer-content feed), and `/b/:slug` (one business's public profile) — nothing that is _about LOOPIE itself_.
- The in-app "Loopie" wordmark (`Shell.tsx:174`) links to `/profile`, which is correct for a logged-in user switching companies, but is not a marketing surface either.

So today, the entire path to becoming a customer is: know the `/register` URL already, or be sent it directly. There is no page to itemize what the product does, who it's for, or why someone should sign up.

## Goal

`/` becomes LOOPIE's **permanent public homepage, for everyone** — signed-in or not, forever, not just a pre-signup landing screen. It:

1. States what LOOPIE is and who it's for, in plain language.
2. Introduces the product's real pillars as a durable piece of site information architecture — not a one-time pitch — each pillar a concise entry point that can grow its own deeper page later.
3. Gets a visitor to create an account or ask to talk to someone.
4. Is built to keep accumulating real content over time (new pillars, updates, deeper pages) rather than being a fixed, one-off marketing splash.

**Locked decision:** authenticated users are never redirected away from `/`. It stays the homepage for them too — the header simply changes what action it offers (see below). This is a deliberate reversal of this proposal's first draft, which had `/` bounce a signed-in visitor straight to `/calendar`.

## Non-goals (this pass)

- Pricing/checkout — there is no payment processor wired up yet (`CLAUDE.md`: "Live payment processor" is parking lot; funding is recorded, not charged). No plan comparison table, no self-serve checkout.
- Fabricated social proof. No made-up customer counts, logos, star ratings, or testimonial quotes, and no unnecessary "coming soon" language. This project has an explicit, repeated "never invent facts" discipline (see the Ads/Pages starter-content passes in `CLAUDE.md`) and the homepage holds to the same bar. If we don't have a real number or a real quote, the page says something true instead of something impressive.
- SEO infrastructure, blog/content marketing, localization.
- The deeper per-pillar pages themselves (`/product/{pillar}` or similar) — this pass establishes the pillars as homepage entry points and reserves the IA, it does not build out full dedicated pages for each one yet.
- Changing the authenticated app's own nav or default in-app landing surface (`/calendar` stays exactly as-is _once a signed-in user chooses to enter the app_).

## Audience & positioning

Pulled from the project's own source docs so the pitch isn't invented from scratch:

- **Primary user** (`docs/strategy/01-product-vision.md`): a business owner, manager, salesperson, or marketer at a small-to-mid-sized business who doesn't want to learn complex CRM software.
- **Core promise** (same doc): _"Know who your customers are, send the right message, follow up automatically, and understand the result."_
- **Original positioning line**: "Mailchimp simplicity + lightweight CRM + sales follow-up + automation." The product has grown well past Phase 1 since that line was written — it now covers advertising, hosted landing pages, first-party ad serving, a full leads/sales pipeline, a money ledger, referral affiliates, and a coaching-driven Calendar. The homepage pitch reflects the real current scope, not the old Phase-1-only framing.
- **Go-to-market reality** (`docs/strategy/business-plan.md`): early customer acquisition is demo/qualified-prospect driven, not proven self-serve. **Locked decision:** the homepage keeps both "Get started" (self-serve) and "Talk to us" (sales-assist) as its two primary conversion paths.

## Voice and copy principles

**Locked decision.** These rules apply to every piece of copy on the page — hero, pillar entries, River section, CTAs, footer — not just the examples below:

- **Readable over clever.** Write in plain, direct sentences a business owner can read once and understand. No jargon, no shorthand that requires already knowing the product.
- **No marketing voice, no overpromising.** Describe what the product actually does, plainly. Don't sell, don't hype, don't claim a benefit the product doesn't actually deliver.
- **No quippy, cute, or artificially compact phrasing.** No rhetorical contrast lines ("not just a dashboard number," "not a generic to-do list"), no fragments strung together with em-dashes to sound punchy, no wordplay. Complete sentences with a subject and a verb.
- **No redundancy.** Say a thing once. Don't restate the same idea in a follow-up clause for emphasis.
- **Concise still means one clear sentence, not a fragment.** The earlier guidance that pillar entries stay "concise" means brief, not clipped — each one is a complete, plain sentence, not a telegraphic phrase.

The pillar copy below has been rewritten to this standard; treat it as the working draft, not just an example of the rule.

## The pillars — real, not collapsed, and part of the long-term site IA

**Locked decision:** keep the broader pillar structure. Don't collapse the real product surfaces into a handful of generic marketing buckets ("Marketing," "CRM," "Automation"). Each pillar below is one real, shipped V1 module from `CLAUDE.md`, described narrowly enough to be true, with a reserved future path for a deeper page. The homepage doesn't have to fully explain any one of them — each is a concise, honest entry point, not a feature-complete pitch.

**Locked decision on group names:** groups are named for what actually happens, not abstract lifecycle verbs — no "Attract / Capture / Convert / Grow" staging language on the page itself (that reads as a consulting framework, not a product). The four groups:

### Bring in customers

| Pillar                 | Entry-point copy                                                                                                                                  | Reserved future path   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Advertising Campaigns  | You create a campaign with a creative, a platform, a budget, and a schedule, and LOOPIE tracks where the traffic it sends actually goes.          | `/product/advertising` |
| First-Party Ad Serving | LOOPIE can serve your ads directly, without relying on an outside ad platform, and those ads feed into the same lead pipeline as everything else. | `/product/ad-serving`  |
| Landing Pages          | You build a page from a template and publish it, and LOOPIE hosts it at its own web address.                                                      | `/product/pages`       |
| Forms                  | You attach a form to any page, and each submission automatically becomes a contact and a lead.                                                    | `/product/forms`       |
| Messages & Automation  | You send an email or text to your audience from one composer, and you can set up a follow-up message that sends itself after a new lead comes in. | `/product/messages`    |

### Manage leads and sales

| Pillar                 | Entry-point copy                                                                                                                                    | Reserved future path |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Contacts & Audiences   | You import or create your contacts, record how each one can be reached, and group them into audiences.                                              | `/product/contacts`  |
| Leads & Sales Pipeline | Every lead moves through one pipeline from first contact to a completed sale, and LOOPIE records which message, ad, page, or referral it came from. | `/product/pipeline`  |

### Plan, track, and operate

| Pillar           | Entry-point copy                                                                                                                                               | Reserved future path    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| CRM Integrations | You connect an existing account, such as Shopify, WooCommerce, HubSpot, Salesforce, or Google Sheets, and its contacts and orders flow into the same pipeline. | `/product/integrations` |
| Money & Ledger   | LOOPIE keeps a ledger of ad funding, spending, fees, and commissions, so you can see where the money went.                                                     | `/product/ledger`       |
| Calendar         | LOOPIE looks at the real state of your business and tells you what to do next, based on what has and has not happened yet.                                     | `/product/calendar`     |
| Teams            | You invite the people on your team, give each one a role, and see what each person is responsible for.                                                         | `/product/teams`        |

### Grow through partners and reach

| Pillar             | Entry-point copy                                                                                                                              | Reserved future path  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Affiliate Partners | You set up referral partners, give each one a link to share, and LOOPIE calculates and pays their commission when a referral leads to a sale. | `/product/affiliates` |
| River              | You can share an update, an ad, or a page to River, LOOPIE's public feed, where anyone can find your business.                                | `/product/river`      |

**On Affiliate Partners specifically:** the research for this proposal's first draft under-sold what actually exists. `apps/web/src/App.tsx` shows a complete, shipped, business-facing admin flow — `/affiliates` (list), `/affiliates/new` (create), `/affiliates/classes`, `/affiliates/payouts`, `/affiliates/:affiliateId` (detail) — on top of the ledger-backed `AffiliateService`/`Commission`/`Payout` chain `CLAUDE.md` already documents as hardened. That's a business managing _its own_ referral partners inside the product today, which is different from — and should not be confused with — LOOPIE's separate _platform_ affiliate program (`/affiliate-program`, `PlatformAffiliate*`, people who refer new businesses to LOOPIE itself). The homepage pillar describes only the first one, and only in terms of what a business can do with it right now: set up partners, track referrals, pay commissions. **Locked decision:** stay accurate to what exists — don't describe or imply a separate self-service portal for the referral partner themselves, since that isn't part of this feature.

**On River:** added to the pillar list this round (it wasn't in the first draft). It's a real, shipped feature — `RiverPage`/`RiverPostPage`/`PostToRiverModal`/`BusinessProfilePage` (`apps/web/src/App.tsx`), backed by a real `RiverPost` model (`packages/db/prisma/schema.prisma`) — a public feed a business posts updates, ads, or shared pages to, and where anyone (no account required, per `App.tsx`'s public `/river` route) can discover them. It belongs with Affiliates under "Grow through partners and reach" because both are about reach beyond a business's own direct list — referral partners and public discovery, respectively — not paid acquisition or CRM.

## Proposed page structure

**Locked decision.** Header → Hero → 4 grouped product areas → River / real content → CTA → Footer. Short enough to cover the whole product without turning the homepage into a catalog, and it leaves the actual depth for the `/product/...` pages later.

1. **Header.** Minimal nav (see Header behavior below) + the auth-aware action slot.
2. **Hero.** One sentence describing the product. Two CTAs: "Get started" (primary, → `/register`) and "Talk to us" (secondary, opens the site-inquiry flow — see below).
3. **The pitch, in the product's own words.** The core promise line, updated for current scope.
4. **Four grouped product areas** — the named groups above, rendered as a **compact, structured index**, not thirteen feature cards. See "Pillar index treatment" below for exactly how weight and screenshots are distributed. No "learn more" link yet where no deeper page exists (see Non-goals) — entries are informational this pass, not dead links. Affiliate Partners' and River's group entries stay light here (a line each) since River gets its own larger treatment next.
5. **River / real content.** Its own section, after the grouped index, carrying real imagery/content (an actual post, a real business's page or ad shared to the feed) — the one deliberate place the page breaks from typographic/software chrome into real human content, per the design direction below.
6. **Final CTA band** — repeat "Get started" and "Talk to us."
7. **Footer.**

There's no separate "how it works" step in this draft — the four group headings themselves already tell the story (bring people in → manage what comes of it → run the business day to day → grow beyond your own list), so a redundant staged-journey section would just repeat that in weaker, more abstract language.

This structure is intentionally modular (a header, a hero, an ordered list of independent content blocks, a footer) so more sections — announcements, a real case study once one exists, additional pillars — can be added later without a redesign. That directly serves the "place for fresh site content over time" requirement: nothing about the layout assumes it's a one-shot, static page.

## Pillar index treatment

**Locked decision.** The 13 pillars must read as a structured product index, not a grid of 13 equal feature cards. Concretely:

- **Format, not cards.** Thin rules, spacing, type hierarchy, and the group headings do most of the organizing work — not boxes. A group renders as a heading followed by a tight list of pillar entries (bold name + one concrete line), separated by hairlines, the same idiom the rest of the design direction already commits to (thin rules over cards).
- **Unequal visual weight, on purpose.** Advertising, Landing Pages, Calendar, Contacts/CRM, and River can take a larger moment — bigger type, more room, occasionally a screenshot. Forms, Teams, and other lighter entries stay a single compact line each. Every pillar is present and real; not every pillar gets the same amount of space, because they don't carry the same amount of product weight.
- **Screenshots are scarce, not exhaustive.** 3–5 real product visuals total, across the _entire page_ — not one per pillar. Reserve them for the strongest moments (candidates: the Pages editor, an Ads preview, Calendar, the CRM/lead pipeline), plus whatever River's own section contributes. Everything else in the index is typographic only.
- **No over-designing.** No per-pillar icon, no per-pillar card chrome, no decorative filler. If a pillar doesn't earn a screenshot, it's just well-set type.

## Visual design direction

**Locked decision.** Shorthand: **editorial typography + software precision + real customer content.** Explicitly not glossy SaaS — no giant gradients, glass cards, blobs, excessive pill buttons, icon grids, fake 3D dashboard mockups, or sections that are all just centered rounded rectangles.

- **Typography.** Large sans-serif headlines, tight tracking, compact supporting copy. Strong contrast between display text and small utility labels — headlines should feel authored, not templated.
- **Layout.** Wide containers, strong left alignment, generous horizontal breathing room. Prefer asymmetry over centering everything.
- **Color.** Mostly neutral background, near-black text, one strong LOOPIE accent color used deliberately, not everywhere. Dark sections used sparingly, for emphasis, not as a default alternating pattern.
- **Cards.** Fewer rounded cards overall. Reserve a card treatment for content that's genuinely a contained object (a pillar entry, a product screenshot). Prefer open layouts organized with dividers over boxing everything.
- **Borders.** Thin, subtle rules to organize sections instead of boxes-with-shadows everywhere.
- **Radius.** Restrained — small/medium radii, not bubbly 24–32px corners throughout.
- **Shadows.** Almost none. A product screenshot can float very slightly; the page's own structural chrome stays flat.
- **Product imagery.** Real UI — real Pages editor, real Ad preview components, real CRM/pipeline, real Calendar — not abstract illustration. This is a real implementation dependency: screenshots need to be captured from the actual app (a real demo business, not fabricated data), not designed as mockups. Flagged in the technical plan below.
- **Icons.** Simple mono line icons where truly needed, or none. Icons should never become the design.
- **Section rhythm.** Alternate open white sections, denser product-composite sections, and occasional dark/high-contrast bands — not one repeating template block for the whole page.
- **Motion.** Subtle hover/reveal/UI movement only. Nothing continuously floating, glowing, or auto-animating.
- **Photography/content.** Where River or a featured business appears, let its real imagery/content break the otherwise structured, typographic interface — that contrast is intentional, not a departure from the system.

## Header behavior

**Locked decision: keep the header minimal.** Two independent things live in it:

1. **A small top-level nav** — Product, River, Affiliates, and at most one more. "Product" points at the grouped pillar index on this same page (an anchor/scroll target, not a separate route, since the deeper `/product/...` pages don't exist yet); "River" and "Affiliates" link out to those already-live surfaces (`/river`, and the Affiliate Partners pillar's reserved path once it exists, or directly to something equivalent today). A fourth item is optional, not required — three is already enough to be useful without cluttering the header; see Remaining calls below for candidates.
2. **The auth-aware action slot**, unchanged from before:
   - **Anonymous:** "Log in" (text link → `/login`) + "Get started" (button → `/register`) — mirrors the existing secondary/primary pairing already used elsewhere in the app's own auth pages.
   - **Signed in:** a single "Open LOOPIE" button, taking the user straight back into the app.
   - **Loading:** degrade the same way `Shell.tsx`'s own `Header` already does for its one other auth-optional route (`/river`) — render without assuming either state until `useCurrentUser()` resolves, rather than flashing one state and swapping.

This requires knowing, from a page rendered outside `AuthGuard`, whether the visitor is signed in — which the app already does today for `/river`, so no new mechanism is needed, just the same `useCurrentUser()` call.

## The "talk to us" CTA already exists — reuse it

The product **already has** a live, working, unauthenticated inbound-inquiry mechanism that fits "Talk to us" exactly, with zero new backend work:

- `POST /site-inquiries` (`packages/api-spec/openapi.yaml`, `apps/server/src/handlers/siteInbox.ts`) is a public endpoint (`security: []`) that stores a `SiteInquiry` row and emails every `SITE_ADMIN` staff member who has notifications on.
- It's already wired end-to-end on the frontend: `apps/web/src/components/ads/AdvertiseHereLink.tsx` is a small modal (name/email/message → `useCreateSiteInquiry`) that submits to it, with idempotent retry via a client-generated `submissionKey`.
- Staff already have a place to see these (`CLAUDE.md`: "Platform Admin → Site inbox").

**Locked decision:** generalize `AdvertiseHereLink` into a reusable `SiteInquiryButton`/modal (same component, parameterized title/default message), and use it for "Talk to us" wherever it appears on the homepage. `AdvertiseHereLink` itself becomes a thin caller of the generalized component so its existing behavior/tests are undisturbed.

## Technical plan

- **New page**: `apps/web/src/pages/marketing/HomePage.tsx` (name TBD), with its own minimal `MarketingLayout` — auth-aware header (above), page content, simple footer. Rendered outside the authenticated `Shell` (no app nav, no business context) but reachable by everyone regardless of auth state.
- **Not a reskin of the app's existing UI kit as-is.** The visual direction above (thin rules over boxed cards, restrained radius, near-flat shadows, asymmetric left-aligned layout) is deliberately different from the authenticated app's own denser, card-heavy dashboard style. Reuse the existing `Button`/`Modal`/`Input` primitives and Tailwind tokens/dark-mode handling for behavior and accessibility, but expect the homepage's own layout components (section shells, the pillar-group blocks, the hero) to be new, purpose-built pieces rather than existing `Card`-based patterns — a straight reuse of `Card` everywhere would reproduce exactly the "everything is a rounded rectangle" look this direction rejects.
- **Real product screenshots are a real asset dependency**, not a styling nicety — the design direction explicitly calls for real UI (Pages editor, Ad previews, CRM/pipeline, Calendar), not illustration. These need to be captured (e.g. via a throwaway Playwright pass against a real demo business, similar to how this codebase already captures thumbnails elsewhere) and checked in as static images. This is content-production work to scope, not a blocker to starting the page itself.
- **Reuse, don't reinvent**: the generalized `SiteInquiryButton` (see below) for "Talk to us."
- **No unnecessary backend changes.** The only backend-adjacent piece (`site-inquiries`) already exists and is already public.

## Routing plan

This is the one place where "keep `/` public for everyone, always" has a real technical consequence worth calling out explicitly, since two existing flows currently rely on `/` performing the old auth-redirect:

- **Add** a new top-level public route, unconditionally rendered regardless of auth state:
  ```tsx
  <Route path="/" element={<PublicHomePage />} />
  ```
- **Move** the authenticated "where should a signed-in user land" logic (today `BusinessDefaultRoute`, sitting at the index route under `/`) off of `/` entirely, since `/` no longer belongs to the authenticated route tree. It moves to a dedicated, nav-invisible path — e.g. `/app` — that keeps doing exactly what it does today (send a business that hasn't finished setup to `/business/setup`, everyone else to `/calendar`).
- **Update the two flows that currently `navigate('/')` expecting the old redirect**, since `/` will no longer perform it:
  - `LoginPage.tsx`'s default `returnTo` (currently `'/'`, `LoginPage.tsx:29`) → `'/app'`.
  - `RegisterPage.tsx`'s post-signup `navigate('/')` → `navigate('/app')`.
  - The homepage's own "Open LOOPIE" header button (signed-in state) also points at `/app`, so it goes through the same setup-vs-calendar check rather than hardcoding `/calendar`.
- **Unaffected**: the `*` catch-all (`Navigate to="/calendar"`), the authenticated Shell's own nav/wordmark, and everything already inside `AuthGuard` (`/calendar`, `/contacts`, etc.) — none of it changes shape, it's just reached via `/app` instead of `/` as the very first hop after login/register.

Net effect: `/` is now a real, addressable, permanent page for anyone, at any time, authenticated or not — exactly as directed — and the app's actual entry point simply moves one hop later (`/app`) instead of overloading `/`.

## Decisions locked (from the prior round of review)

1. `/` is the permanent homepage for everyone — no auth redirect, ever. _(Locked.)_
2. Header action slot is auth-aware (Log in/Get started vs. Open LOOPIE); page content itself is identical for everyone. _(Locked.)_
3. Keep the full, uncollapsed pillar list (12 real modules) as part of the site's long-term IA, each a concise entry point reserving a future deeper page — not a handful of marketing buckets. _(Locked.)_
4. Keep the Affiliate pillar, described accurately (business-facing referral-partner management, which is real and shipped) with no implication of unfinished partner-portal functionality. _(Locked.)_
5. Primary conversions stay "Get started" + "Talk to us"; "Talk to us" reuses the generalized site-inquiry flow. _(Locked.)_
6. No fabricated proof, no fake metrics, no unnecessary "coming soon" copy. _(Locked.)_
7. Phase 1 is frontend/routing/content only — no unnecessary backend changes. _(Locked — consistent with reusing the existing `site-inquiries` endpoint as-is.)_
8. Pillar groups are named for what actually happens ("Bring in customers," "Manage leads and sales," "Plan, track, and operate," "Grow through partners and reach") — no abstract lifecycle-stage language on the page. _(Locked.)_
9. Visual direction is editorial typography + software precision + real customer content, explicitly rejecting glossy-SaaS defaults (gradients, glass, blobs, pill-everything, icon grids, fake 3D dashboards, all-centered-rounded-rectangles). _(Locked — full spec above.)_
10. Page structure is exactly Header → Hero → 4 grouped product areas → River / real content → CTA → Footer — no extra top-level sections this pass. _(Locked.)_
11. The 13-pillar index is compact and unevenly weighted (Advertising/Pages/Calendar/CRM/River can be larger; Forms/Teams/etc. stay a line each), rendered as a structured index (thin rules + typography), not 13 cards. _(Locked.)_
12. Real product screenshots are scarce — 3–5 across the whole page, not one per pillar — with River's own section supplying real content/imagery as the page's one human-content break. _(Locked.)_
13. Header nav is minimal: Product, River, Affiliates, plus at most one more. _(Locked — exact 4th item still open, see below.)_
14. All page copy is plain and direct: complete sentences, no marketing voice or overpromising, no quippy/cute/compact phrasing, no redundancy. Applies to every section, not just the pillar entries. _(Locked — full spec above, pillar copy rewritten to match.)_

## Remaining implementation-level calls (not blocking, will resolve during build unless you want to weigh in)

- Exact pillar copy wording/order within each locked group is a first draft, not final.
- Whether "Talk to us" also appears in the header for anonymous visitors, or stays a hero/final-band-only CTA (current draft: header stays exactly "Log in / Get started" per your spec, "Talk to us" lives in the hero and final band).
- Naming for the nav-invisible post-auth landing route (`/app` used above as a placeholder — any existing convention you'd prefer instead).
- Exactly which of the 5 featured pillars (Advertising, Pages, Calendar, CRM, River) get one of the 3–5 real screenshots, and which real demo business/screens they're captured from. Current lean: 2–3 within the grouped index (Pages, Calendar, and one of Advertising/CRM), with River's own section supplying the remaining 1–2.
- Whether the header's optional 4th nav item exists at all this pass (candidates if so: a future Pricing/About page, or nothing — three items may simply be enough).

## Suggested phasing

- **Phase 1** (this proposal): homepage content/layout, auth-aware header, pillar grid (no deep pages yet), routing changes (`/` public permanently, post-auth landing moved to `/app`, Login/Register updated), `SiteInquiryButton` generalization. No backend/schema changes.
- **Phase 2** (future, separate proposal): the 12 reserved `/product/{slug}` deep pages, any additional homepage content sections, anything beyond what's specified here.
