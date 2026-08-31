# Product Principles (2026-08-28)

## Status

This is the thesis, locked before more implementation reshapes the app around unstated assumptions. It came out of a design-review conversation that started as "how do we make LOOPIE's strongest values more apparent" and ended up questioning something more fundamental — whether pushing user-authored ads to Meta/Google was the right model at all. The conclusion changes how the product should be described, and puts one already-shipped interaction pattern in tension (flagged below, not resolved here). Read alongside `docs/architecture/00-unified-ia-navigation.md` (what the nav actually is) and `docs/design/00-design-language-spec.md` (what it looks like) — this doc is the "why the shape is this shape," source of truth for future reshaping decisions.

Supersedes `01-product-vision.md`'s framing in one specific way, not wholesale: that doc's "the primary surface is Messages" was written before Campaigns/Ads/Pages/CRM existed as their own surfaces at all — Phase 1 history, not current thesis. Its "Know who your customers are, send the right message, follow up automatically, understand the result" core promise still holds; it's just no longer the _whole_ product, and this doc supersedes it on structure. `activity-command-center-implementation-roadmap.md` and `inbox_implementation_plan.md` are implementation-level precedent, not superseded — the Inbox consolidation this session did (see `00-unified-ia-navigation.md`'s revision log) was executing against `inbox_implementation_plan.md`'s own plan, and this doc's "Inbox = command center" thesis is confirming that direction was right, after the fact, at the principle level rather than the ticket level.

**Revision (2026-08-29) — Inbox absorbs Home; entities replace parallel top-level worlds.** The original "Core Model" below (kept, marked superseded, not deleted) framed Inbox as one of five roughly-parallel pillars, each with its own nav presence. Design work the next day pushed further: designing the product "like a native app" surfaced that four-or-five equal top-level worlds is itself the thing making LOOPIE feel like a collection of modules rather than one workspace. The resolved position is stronger than "Inbox is the center of gravity operationally" — **Inbox is the root. Everything else — CRM, Pages, Ads, Email, Posts, Media, Connections — is reachable through entities, search, creation, and secondary navigation, never as a peer primary world competing with Inbox at the root.** The term itself changes too: what was being called "Home" is "Inbox" — one name, not two screens that happen to look similar. See "The Native Model" below, which supersedes the pillars framing.

**Revision (2026-08-29, later same day) — four corrections before treating any of this as locked.** A first pass at this revision still had internal contradictions and one overreach; corrected in place rather than left as a second layer of notes, since these aren't new decisions so much as this same revision being made consistent with itself: (1) "The Native Model" said Inbox is the _only_ root surface while "Navigation Principle" then described CRM/Marketing/Administration as stable root-level entry points — genuinely contradictory, resolved in Inbox's favor (see "Navigation Principle" below, rewritten). (2) The connection principle originally said discovered value shows "before or alongside" authorization — not possible, since you can't show data you don't have access to yet; corrected to a real two-step rule (see "First-Login Experience" below). (3) Automation had drifted into a stated product pillar with its own Create-sheet entry and multi-paragraph strategy — overstated for what it actually is today (scheduling machinery behind Email/Posts, not a user-facing concept of its own); pulled back out of Create and out of pillar-status language (see "Global Creation Model" and the Automation section below, both trimmed). (4) The ad-platform ownership language ("connect, import, measure, never author") was more absolute than the actual direction — LOOPIE already has push-ready infrastructure, and supported publishing may eventually be justified; corrected to "external platforms remain authoritative, starting posture is connect/monitor/attribute, supported push is a conditional future addition" (see "The Ownership Rule" below).

**Revision (2026-08-30) — "Inbox is the root" is reversed. Persistent top nav, five peer tabs, shared welcome section.** The 2026-08-29 thesis above was tried in practice — a single Inbox root, everything else reached through a compact launcher, no persistent tabs — and it didn't hold up for real use ("the inbox center is not working for me," stated directly, not inferred). Reversed back to a persistent top nav, inspired by a reference screenshot the user supplied directly: **Home · Pages · Advertising · Contacts · Messages as five real, equally-weighted peer tabs**, always visible, never collapsed into a launcher. Messages is promoted to a full tab for the first time (it existed before only as a `SECONDARY_NAV` launcher entry, despite being a fully real, already-built surface). The Singleton/Collection/Entity grammar below is **not** reversed — it still governs entity back-navigation (`‹ Contacts`, `‹ Pages`, etc., resolved from `location.state` with a collection fallback) — only the _root_ changed: a selected tab shows no back affordance of its own (it's a peer root, not something descended into), and the universal fallback for everything else (singletons, legacy/orphaned pages) is `‹ Home`, not `‹ Inbox`. Inbox as a standalone page/route is retired; its data (the mixed thread/activity feed) now lives inside a new shared `WelcomeSection` component (`apps/web/src/components/welcome/`) — business identity header, a real cross-surface "Live presence" grid (recent live Pages/Ads/Messages, each with real tracked stats, not fabricated engagement numbers), the former Inbox feed restyled as "Recent response," a "Results" panel with real week-over-week deltas, and an "Add something" quick-create row — and that same component is embedded at the top of **all five** tab roots (Home, Pages, Advertising, Contacts, Messages), not just Home. `docs/architecture/00-unified-ia-navigation.md` is stale relative to this (and was already stale relative to the 2026-08-29 revision it predates) — not rewritten as part of this pass; treat this doc and the live `Shell.tsx`/`WelcomeSection.tsx` code as the current source of truth.

## The Core Model (superseded 2026-08-29 — kept for the record, see "The Native Model" below)

**Operationally Inbox-first. Structurally CRM-first.** Those are two different axes, not a contradiction:

- **Inbox is where the user works day to day** — the operational center of gravity, where signals from every other surface converge into one feed. This is already what Home is: the Inbox feed dominant, everything else reachable from below it. That wasn't originally designed to this exact thesis, but it already has the right shape — confirmation the direction was sound, not a coincidence to paper over.
- **CRM is the structural foundation** — the system of record for people, leads, customers, and sales. Every acquisition surface (Pages, Ads, Messages) ultimately writes into it. It's the foundation _because_ every other surface depends on it existing correctly, not because it's where users spend the most time.

Five pillars, each with a distinct job:

```text
Inbox        Command center. Where signals from every surface converge. Operational, not structural.
CRM          Relationship memory. System of record for people, leads, customers, sales.
Pages        Owned acquisition surface. LOOPIE creates, hosts, edits, and serves these directly.
Ads          Acquisition engine. Connected external channels LOOPIE measures — and, separately,
             first-party ad inventory LOOPIE creates directly (AdUnit/Pages ad slots — see the
             ownership rule below for why these are NOT the same relationship as an external
             platform campaign, even though both currently live under "Advertisements").
Automation   Background actions tying the rest together. Source-agnostic by design (a trigger
             doesn't care whether the Lead came from a Page, an Ad, or a Message).
```

This framing's one durable point, carried forward unchanged into the revision below: **Inbox does not replace Pages or Ads as surfaces — it surfaces what needs attention from them.** A user must still be able to go build a page, create an ad, or check a campaign's performance directly, as a first-class task with real depth — not only react to something Inbox pushed at them. Depth moved (from "its own root nav item" to "its own deep inner page reached from Inbox"), but it didn't shrink.

## The Native Model (2026-08-29)

**Inbox is the center of gravity. Everything else is an entity you enter from it.**

Inbox does three jobs at once, on one screen:

1. Shows what's happening right now (needs-attention feed: messages, leads, campaign issues, page activity, scheduled sends).
2. Shows what parts of the business are connected and running (compact status rows for Ads, Pages, Email, Posts — each with one useful metric, not a dashboard).
3. Gives direct entry points to create or connect something new.

A calm sketch of the shape:

```text
Inbox

Needs attention
  Sarah replied to your Instagram message · 2m
  New lead from Contact Page · 18m
  Facebook campaign generated 4 leads today · 1h

Running
  Ads      3 active · $183 today
  Pages    6 live · 71 conversions
  Email    1 scheduled
  Posts    2 this week

Add to LOOPIE
  Connect customer data
  Connect advertising
  Connect social/messaging
  Create a page
```

Tapping any row is the entire navigation model: `Summer Campaign` → campaign detail. `Emergency Landing Page` → page editor. `Jane Smith` → CRM/contact detail. `Friday email` → campaign detail. Inner pages stay as deep and powerful as they need to be — CRM, Pages, and Ads lose their root nav slot, not their capability. The structure is `Inbox → entity → detail → deeper action`, not `Inbox | CRM | Ads | Pages | Email | ...` sitting as equals.

**The same screen adapts to how established the business is, rather than switching screens.** A brand-new user sees a mostly-"Add to LOOPIE" Inbox — more invitations to connect or create than live activity, because there isn't much yet. An established user sees a mostly-"Running"/"Needs attention" Inbox — the add-prompts shrink as real entities accumulate. It's one screen whose balance shifts, not an onboarding screen that gets replaced by a different "real" home screen once setup is done.

**Locked rule for future growth: new capabilities enter LOOPIE through Inbox first, not by earning a new root navigation item.** A new capability shows up as a new kind of row, or a new "Running"/"Add to LOOPIE" entry — not a sixth nav tab. This is what keeps the product calm as it grows instead of re-accumulating the module-collection problem this whole revision exists to fix.

## Native Operating Loop

The product's actual demonstration of value, not a marketing line — this loop is what "Inbox is the center of gravity" is _for_:

```text
Connect → activity arrives → LOOPIE understands it → user responds or creates → outcome returns to Inbox
```

Every connected source (customer systems, ad platforms, social/messaging channels, or LOOPIE-owned Pages/Forms/Ads) feeds this same loop. The loop closing — something real happened on the actual internet, and the result came back into Inbox — is the moment the product proves itself, not a features list or a metrics dashboard.

## First-Login Experience

No dashboard. No long setup wizard. The sequence is deliberately short — but as of 2026-08-29 it starts with the business itself, not a connection prompt.

0. **Establish the business first, because everything else inherits from it.** One calm screen (or a very short stepped sheet — not six separate screens, even though six fields are asked): business name, location/service area, industry, target audience, social profiles, logo/avatar. This is a different question from "connect an account" below — it's not asking for third-party authorization, it's the minimum identity LOOPIE needs to act on the business's behalf at all, and it doesn't contradict "never a six-screen intake form" because it's one screen, not six. It immediately powers the business profile, Page defaults, Ad defaults, email/post sender identity, targeting suggestions, and branding throughout LOOPIE — asked once, reused everywhere, instead of re-asked per surface later. After submit, drop directly into Inbox — no separate "setup complete" interstitial.
1. **Pitch, not a questionnaire.** "Run your online marketing in one place. Connect the places where customers already interact with your business." One primary action (`Connect an account`), one small secondary escape hatch (`Explore first`) — never a six-screen intake form.
2. **One connection, not the whole business.** A picker (Instagram/Facebook, Google, Gmail/Outlook, website, Shopify, HubSpot, …) that asks the user to connect _one_ meaningful source and stops there. Don't demand the entire business get configured before the product does anything.
3. **Two distinct moments, not one blurred together.** Before authorization, show the _capability being unlocked_ — a promise, not real data yet, since there's nothing to show real data from until access is granted ("Connect Facebook to see conversations and leads here"). Immediately after authorization, show the user's _actual discovered data_ — not a plumbing confirmation. The success state is never "Facebook connected successfully!" — it's "Facebook is connected — 12 conversations found, 3 recent leads, 2 campaigns running. View activity." **The connection itself isn't the value; what LOOPIE discovered through it is.** This is a general principle, not just first-login copy: every connection flow states the capability first (pre-auth) and delivers the real discovery second (immediately post-auth) — authorization itself is a minor step in between, not the payoff either side is waiting on.
4. **Then prompt one outbound action, informed by what they connected.** Once the user has consumed something (seen real activity appear), introduce creation: "You're connected. Now reach your customers." The suggestion should match the source — Facebook connected → suggest a post; email connected → suggest a send; website connected → suggest a landing page; CRM connected → suggest messaging those customers. Don't offer a generic menu here; the whole point is that it's informed by what just got connected.

On Inbox itself: while zero connections exist, the "Add to LOOPIE" section is compact — roughly a fifth to a quarter of the screen, never a full onboarding takeover — with empty-state rows underneath it that already show the product's shape ("Messages — connect an account to see customer messages here," "Leads — new form submissions and inquiries will appear here," "Marketing — ad, page, post, and campaign activity will show here"), so the user understands what will happen _before_ they connect anything. The first real connection collapses that section dramatically — this is the "oh, this thing is alive" moment, and it should read as a state change on the same screen, not a transition to a different one.

**Inbox itself opens on the business, not just a greeting.** A small identity card sits above the feed — logo, business name, location, industry, one-line audience description, a `View profile` link — so the business's own identity (established in step 0 above) is the first thing reinforced on the screen the user lands on immediately after setup, not something buried behind a menu. This card is deliberately compact (a few lines, not a hero), and its content is exactly the fields captured in step 0 — nothing here is computed or inferred, it's a direct read of what the business told LOOPIE about itself.

**Grounded against the actual schema (2026-08-29):** `Business` today has only `name` plus billing fields (`stripeCustomerId`, `subscriptionStatus`) — no `location`, `industry`, `targetAudience`, `socialProfiles`, or `logo`/`avatar` field exists yet. Step 0 above and the identity card are real, additive schema work (new columns on `Business`, or a related `BusinessProfile` table), not a UI-only change. Separately, `apps/web`'s existing `/profile` route (`ProfilePage.tsx`) is a _user_ account/settings page today — billing, permissions, platform connections, logout — not a business-identity page. The "View profile" singleton this doc describes is a different object than what `/profile` currently shows; reconciling that naming collision (repurpose `/profile`, or introduce a distinct `/business` route) is a real decision for whoever picks up this work, not resolved here.

## Global Creation Model

A single, persistent **Create** action — not a root nav item competing with Inbox, a floating/global affordance always available on top of it. Tapping it opens an action sheet: Message, Email campaign, Social post, Page, Ad (Form/Offer/Campaign are reasonable later additions, not required at launch). **Automation is deliberately not on this list** — see the Automation section below for why; scheduling (when an email or post goes out) belongs inline in that item's own compose flow as a "Schedule" step, not as its own entry in the global creation menu.

This is the other half of the product thesis, and it's a real pairing, not a decoration:

```text
Inbox  = what is happening
Create = make something happen
```

Consuming and creating are equally central to the product, but they don't need equal screen real estate to express that — Inbox is predominantly consume/respond, Create is publish/act, and one persistent action expresses that better than a matching set of noun-based tabs would. **Create is important enough to occupy the navigation slot a root-level Pages/Ads tab would otherwise take** — that's a deliberate trade, not an oversight, and part of why Pages/Ads don't need their own root slot once Create and Inbox exist.

## Navigation Principle

**Inbox is the root. Everything else is reachable through entities, search, creation, and secondary navigation — not peer primary worlds.** This is the stronger version, and it's the one that's locked: CRM, Marketing (Pages/Ads/Posts/Email), and Administration (Connections, Media, Billing, Settings) are not co-equal root destinations sitting alongside Inbox. They're reached by tapping an entity surfaced _in_ Inbox, by search, by the Create action, or by a clearly-secondary navigation affordance (a "more"/utility rail, not a matching set of primary tabs) — never by a root-level tab that competes with Inbox for the same visual weight. An earlier pass at this section described CRM/Marketing/Administration as "stable root entry points," which directly contradicted "The Native Model" above; that language is wrong and is corrected here, not preserved as a nuance.

**Lock the model, not the labels.** The specific names explored during this design pass (`Home · CRM · Create · Marketing · More`, "Observe/Relationships/Create/Marketing/Administration") are illustrative groupings, not a locked tab bar — mobile/native and desktop may legitimately express "reachable through secondary navigation" differently (a thin icon rail, a search-first command palette, a "more" sheet), as long as none of them promotes to Inbox's level of primacy. What's locked is that grouping logic — by user intent, not by backend/domain ownership — and that exactly one thing sits at the root.

**"Marketing" is an umbrella, not a merge.** Pages and Ads remain distinct product surfaces — their own creation flow, their own monitoring, their own data model, their own lifecycle — even though neither gets its own root slot. Grouping them under one compact secondary-navigation label is purely a density concession (exposing every first-class capability as its own root item is "the software's database structure leaking into the interface"). Wherever Marketing is expressed, Pages and Ads must still feel like peers inside it, not like one absorbed the other. The same logic applies to "Administration" grouping Connections/Media/Billing/Settings — grouped for calm, not merged into one undifferentiated settings dump.

## Navigation Model — Single Focus, Adaptive Context (2026-08-29)

Navigation Principle above settled _what's_ at the root vs. reached secondarily. This settles _how a user moves_ between them — the mechanics, not just the map. Locked as a principle; the architecture to build it against is scoped separately in `docs/architecture/02-navigation-stack-scoping.md`, not decided in this doc.

**One primary object owns the viewport at a time. Lists lead to entities; the entity replaces the list until the user backs out.** Not desktop-style split panes and persistent module chrome by default — `Inbox → tap Summer Campaign → Summer Campaign (full screen) → tap 23 leads → Campaign Leads (full screen) → tap Jane Smith → Jane Smith (full screen)`. Each step owns the screen. Global navigation (the More menu, the sidebar/bottom-nav chrome) goes quiet or disappears once a user is genuinely deep in an entity — they chose Summer Campaign; the app becomes Summer Campaign until they're done with it, not "Summer Campaign plus a CRM/Ads/Pages rail still competing for attention."

**Restrained back-context, not web breadcrumbs.** Never `Inbox > Advertising > Campaigns > Summer Campaign > Leads > Jane Smith` — that's what makes software read as enterprise/admin-tool. Show one level back (`‹ Summer Campaign` above `Jane Smith`), not the full stack — the system remembers the whole stack internally (for Back to work correctly), it just doesn't display it all. Desktop, with more room, may add a quiet contextual trail (`Inbox / Summer Campaign / Jane Smith`) but it must never become the dominant navigation element on the screen — restraint applies to both platforms, just with a little more room on one of them.

**Entity-local sections, not global destinations wearing an entity's name.** `Jane Smith`'s `Overview | Activity | Messages | Sales` and `Summer Campaign`'s `Overview | Ads | Leads | Results` are views _of that one object_ — the user stays mentally inside Jane, or inside the campaign, switching what they're looking at without ever feeling like they left. This is a different claim from Navigation Principle's root-level groupings above; it's about depth _within_ an already-entered entity, not about what's reachable from Inbox.

**Creation follows the same rule.** Tap Create → sheet → choose Page → the sheet closes and the full viewport becomes `‹ Inbox` / `New Page` — not a sidebar plus a page-nav plus a builder plus a properties drawer plus five toolbars all visible simultaneously. Even a complex creation flow reveals controls progressively around the object being created, not as a permanent multi-panel workspace.

**Desktop is not "mobile navigation, but wider."** That framing was considered and rejected — the actual principle is **single focus, adaptive context**:

```text
Mobile   One entity owns the screen. Drill in. One-level-back. No persistent global chrome
         once deep.
Desktop  The primary entity still owns the experience — but a secondary contextual pane may
         stay visible if it directly supports that specific entity. Campaign → Leads can be
         Campaign (primary) with Leads as a right-side companion pane; tapping Jane then either
         replaces that pane or opens as the next focused level.
```

The test for whether a companion pane is allowed: **does it help the user understand or act on the current object, or is it just another module competing for attention?** Allowed: a campaign with its own leads panel, a page with its own submissions panel, a contact with its own activity panel, an ad with its own attribution/results panel — all _of_ the primary entity. Not allowed: a campaign with an unrelated CRM nav rail, a Pages browser, and global dashboard chrome all visible at the same time — that's back to competing modules, just arranged as panes instead of tabs.

**State continuity is part of the model, not an implementation detail to backfill later.** Back must restore prior scroll position, filters, search text, the selected Inbox segment, and whatever section was open, where reasonable — this is what makes single-focus navigation feel calm instead of punishing (losing your place every time you back out of something would make "descend and return" worse than tabs, not better).

**The MVP loop this has to keep intact, explicitly**: create an ad → post it to an owned page → see the ad's own interaction and the page's/form's own interaction as _separately observable_ results in Inbox. This navigation model is about how a user _moves through_ Pages/CRM/Advertising, not a reason to fragment or hide them — they stay full, real, entity-rich surfaces reached from Inbox, not casualties of "everything lives in the Inbox dashboard." Whether Inbox's existing thread-type model (`CONTACT`/`ADVERTISEMENT`/`PAGE`/`INTEGRATION`/`SYSTEM`) already keeps an ad-click and a form-submission visibly distinct, or needs more work to, is a real open question — scoped, not answered, in the architecture doc below.

### Singleton, Collection, Entity — the concrete grammar (2026-08-29)

The abstract "one primary object owns the viewport" principle above resolves into exactly three shapes, and every screen in the app is one of them:

```text
Singleton    Exactly one per business. Tapping it opens the detail directly — there is no
             "Business Profiles" list to browse, so a collection screen would be a pointless
             extra tap. Example: the business's own identity/profile.
Collection   Zero, one, or many of a kind. Tapping the summary opens the collection, even when
             it currently holds exactly one item — this is deliberate, not an oversight: it
             keeps the model consistent (the user always knows "tap the panel → see the list")
             and gives an obvious, consistent place to create the second one. Examples: Pages,
             Advertising, Contacts.
Entity       One specific, named thing, reached either through its collection or directly from
             Inbox when Inbox already named it. Its own sections (Overview / Activity / ... )
             describe only that object — see "Entity-local sections" above. Examples: Summer
             Page, Jane Smith, Summer Offer.
```

**The one routing exception, stated precisely**: Inbox rows that already name a specific entity skip the collection and go straight to it — `Sarah submitted Summer Page` opens Summer Page directly, not the Pages collection first. A generic "Running" panel tap (`Pages · 4 live`) opens the collection, since it wasn't naming one specific thing. Same rule, two different starting points — Inbox already knowing the entity is what licenses the skip, not a general shortcut around collections.

**Creation always lands on the entity, never the collection.** Create → Page → save/publish opens the new Page directly (`‹ Inbox` / `New Page`, immediately). The collection is where the user goes to find something that already exists among several, not somewhere creation routes through on its way to the thing just made.

This directly answers one of `docs/architecture/02-navigation-stack-scoping.md`'s open questions ("whether existing canonical entity pages get retrofitted with entity-local tab sections, or that's a separate follow-on") — yes, and it's the same pass as building conditional chrome/state continuity, not a separate one, because the collection/entity distinction _is_ what "one level back" needs to unwind correctly (Back from an entity goes to its collection or to Inbox, whichever actually opened it — the state-continuity mechanism has to know which).

## The Ownership Rule

**LOOPIE directly creates what it owns; it connects to and measures what other platforms own.**

This resolves a real, previously-unstated tension: the product likes that users can create ads and pages and have genuinely portable, first-party acquisition assets — but that value was getting confused with a second, different relationship: pushing a LOOPIE-authored ad object _to_ Meta/Google, where Meta/Google actually own budget, delivery, policy, targeting, and optimization regardless of what LOOPIE's UI implies. Two different relationships were sitting inside one flat "Advertisements" surface:

|             | LOOPIE owns (creates directly)                          | LOOPIE connects to (imports/measures)                                                                                      |
| ----------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Acquisition | Pages, first-party `AdUnit` inventory embedded in Pages | External platform campaigns (Meta, Google, TikTok)                                                                         |
| Contacts    | The CRM record itself — Contact/Lead/Sale               | Inbound integrations (HubSpot, Shopify, Salesforce, Square, Pipedrive) — **already correctly modeled this way**, see below |
| Automation  | Automation rules, triggers, conditions, actions         | — (nothing external to connect to here)                                                                                    |

The CRM integrations model is the existing proof this rule already works in practice: `useSyncIntegration`'s "Sync now" pulls contacts from HubSpot without LOOPIE ever pretending to have authored them in HubSpot.

**Corrected 2026-08-29 — "never author" was too absolute.** An earlier version of this rule said ad platforms should be "connect, import, measure, never author," full stop. That overreached: LOOPIE already has push-ready provisioning infrastructure (`AdRunService.createAndProvision`, the Meta connector), and operating a client's online marketing may eventually justify pushing supported campaigns directly — that's a real, live possibility, not a hypothetical to wave off. The corrected rule: **external platforms remain authoritative. LOOPIE's starting posture is to connect, monitor, and attribute them — not to originate them by default. Supported publishing/control may be added later, specifically where it materially improves marketing operations enough to justify the authenticated accounts, authoritative settings, reliable two-way sync, platform-specific validation, spend controls, and status reconciliation real push requires.** The difference from the original phrasing is real: this is a starting posture with a stated bar for revisiting it, not a permanent "never."

**Concrete implication, unchanged**: as things stand today, budget and targeting for an externally-owned `AdRun` are edited in the platform's own UI (Meta Ads Manager), not in LOOPIE — LOOPIE's role is sync/import, a "Sync now" action pulling in what the platform reports, not an editor with pre-commit consequence-copy. That's the honest description of the _current_ posture, not a claim that it's permanent.

**This puts an already-shipped pattern in tension, flagged not resolved here**: `docs/design/00-design-language-spec.md`'s "Interaction Pattern: Editing Something Backed by an External System" section (routine fields edit in place, creative/destination recreate, provider drift shown as requested-vs-effective) was written and implemented against the _old_ model — LOOPIE as author, platform as sometimes-cooperative executor. Under this rule, an externally-owned `AdRun`'s budget/schedule/targeting shouldn't be "editable in place" as the _default_ UX — the platform's own value is what's authoritative, and monitoring/re-importing it should read as primary. First-party `AdUnit`/Pages editing is unaffected — LOOPIE genuinely is the author there, so "edit in place" stays exactly right.

**Update (2026-08-29) — the data contract is scoped**: `docs/architecture/01-external-ad-monitoring-contract.md` answers the six questions this needed answered (minimal monitoring object, platform-authoritative vs. LOOPIE-owned fields, what sync imports, the attribution chain, what survives from provisioning) — grounded in the actual schema and connector code, not proposed fresh. Its headline finding: **the authority contract already exists** — `AdRun`'s `effective*`/`provider*` fields (platform-reported, pull-only) vs. plain fields (LOOPIE-requested) vs. `leads`/`sales`/`revenue` (LOOPIE's own attribution layer) already encode almost exactly this split; the connector interface already keeps monitoring (`pullSync`) structurally separate from mutation (`updateBudget`/`updateSchedule`/`updateTargeting`) and creation (`pushDraft`), each independently capability-gated. So this was never really a schema migration — it's a UI-sequencing decision (make monitoring primary, demote mutation, don't delete it) still not yet made. That doc also surfaced one real, separate open question worth naming here: `AdUnit` (first-party) still hangs off the legacy `Campaign` model, not `Advertisement` — "First-party AdUnit = LOOPIE-owned mutable state" is true in spirit today but not yet structurally clean, and fixing that is bigger than this contract pass.

## Automation: Not a Pillar, Not on Create — Just Scheduling For Now

Corrected 2026-08-29: earlier drafts of this doc gave Automation its own Create-sheet entry and several paragraphs of standalone product strategy, which overstated what it actually is today. In practice, "automation" right now is the machinery behind scheduled posts and scheduled emails — a property of composing those specific things, not a user-facing concept a business owner thinks of as its own capability. It doesn't get a pillar, a Create-sheet entry, or a root/secondary nav presence. What a user actually sees is **"Schedule"** as a step inside composing an email or a post — never the word "Automation."

**If and when automation grows into something users genuinely reason about on its own** (multi-step follow-up sequences, conditional rules spanning more than one entity), the standing direction is still: surface it contextually, at the point where its trigger or action already lives (a follow-up rule configured right on a Lead's pipeline-stage view, not a standalone "Automations" builder abstracted away from that context) — not a generic trigger/condition/action canvas a user has to learn before expressing something they already understand concretely. That's a future-shape opinion, not a current-UI decision; there's nothing to build against it yet.

## What This Doc Deliberately Doesn't Decide

- ~~The actual monitoring-first Advertisements detail page UI~~ — done (2026-08-29, later same day): see `docs/architecture/01-external-ad-monitoring-contract.md`'s "Follow-on: Monitoring-First UI" section. `AdDestinationRow.tsx`'s external-`AdRun` row now opens outcomes-first (leads/sales/revenue/ROAS), platform metrics secondary, drift shown only when it's actually present, and all mutation (budget/schedule/targeting edits, pause/resume/end, replace creative/destination) moved behind a single capability-gated `Manage` action instead of sitting inline.
- Whether/when `AdUnit` migrates onto `Advertisement` (see the contract doc's Question 3) — a real, separate, bigger decision than the monitoring contract itself.
- The exact contextual-automation UI (which pages get an inline automation affordance first, what that affordance looks like) — a follow-up pass, informed by this doc's rule but not specified here.
- Whether "Create on Meta from LOOPIE" is ever revisited — explicitly conditional (see the Ownership Rule section), not a permanent no.
- The exact set and ordering of "Running" row types on Inbox, or the exact Create action-sheet contents beyond the named starting set (Message/Email/Post/Page/Ad) — informed by "The Native Model" and "Global Creation Model" above, not fully specified here.
- The exact tab labels and information architecture for `apps/web` (current: `Home · CRM · Advertisements · Pages`, per `docs/architecture/00-unified-ia-navigation.md`) — that doc still describes what's actually implemented today and hasn't been rewritten to match this revision yet. This doc locks the _model_ ("Inbox absorbs Home," "entities not parallel worlds," "lock the model not the labels"); reconciling the IA doc and the running app with it is real, separate implementation work, not yet started.
- ~~Desktop's specific expression of "Inbox is the root"~~ — resolved (2026-08-29, later same day): "single focus, adaptive context," see "Navigation Model" above. Desktop isn't mobile-navigation-but-wider; the primary entity still owns the experience, a secondary contextual pane is allowed only when it directly supports that specific entity (not a competing module).
- The exact point at which automation would earn a contextual UI surface at all — the Automation section above states a future-shape opinion, not a trigger condition for when to build it.
- The actual navigation-stack architecture (conditional chrome, state continuity across Back, the desktop companion-pane primitive) — "Navigation Model" above locks the principle, and "Singleton, Collection, Entity" locks the concrete grammar to build it against; `docs/architecture/02-navigation-stack-scoping.md` grounds it in the real routing/Shell code and lists the real open engineering questions, but doesn't decide them or build anything.
- ~~Ad-attribution data exists on a Lead created from an ad-driven form submission, but the Inbox notification copy for it doesn't currently name which ad drove it~~ — fixed (2026-08-29): `submissionInbox.ts`'s `notifyFormSubmission` now reads `New lead from {page}` / `via {advertisement} {platform} Ad` when the Lead's click traced to an AdRun.
- The business-identity setup step (First-Login Experience, step 0) and the Inbox identity card are real, additive schema work, not yet built — `Business` has no `location`/`industry`/`targetAudience`/`socialProfiles`/`logo` field today, and the existing `/profile` route is a user-account/billing page, not the business-identity singleton this doc describes. Neither the schema nor the naming collision is resolved here.
- Whether the business-setup onboarding step and the Singleton/Collection/Entity screen work for Pages/Advertising/Contacts get built now or wait for conditional chrome + state continuity to land first — onboarding is new territory that doesn't touch existing screens, so it can likely proceed independently; the collection/entity screens for Pages/Advertising/Contacts are exactly the "individual Pages/CRM/Advertising redesigns" this doc's own standing instruction says not to touch until the nav-stack architecture exists to build them against. Not decided here — a sequencing call, not a design one.
