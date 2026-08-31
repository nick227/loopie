# LOOPIE Home — System Overview Design Proposal

**Status:** Implemented (initial operating overview)  
**Surface:** Authenticated user dashboard  
**Route:** `/home`  
**Page type:** One-page operational overview  
**Primary question:** What needs my attention now?

## 1. Product intent

Home is LOOPIE's main operating surface. It should answer three questions in one scan:

1. **What is happening?** What is waiting in the Inbox, how far the business reached, what came back, what was spent, and whether that activity became Leads and Revenue.
2. **What is moving?** Recent customer activity, business actions, Sales, imports, sync results, and state changes across LOOPIE.
3. **What needs attention?** Waiting replies, failed Platform Runs or Messages, unresolved identity matches, due follow-ups, and connector or import problems.

Home is not a report library or a grid of product shortcuts. It is a concise operating brief across LOOPIE's two primary domains:

- **Advertisements:** Advertisement → Platform Run → views and clicks.
- **CRM:** Contact → Lead → Interaction → Sale.

Messages, Pages, Media, Automations, and connected CRM or commerce systems support those domains. Home shows their meaningful work, not their background telemetry.

## 2. Audience and page job

The primary user is a business owner or manager who needs confidence without learning a complex CRM or ad platform.

The page's job is:

> Show the six key signals, the Inbox, and the live work moving through LOOPIE.

A user should understand the current situation in under ten seconds and enter the highest-priority task with one click.

## 3. Design direction: The Daily Brief

The aesthetic is a refined operations console: quiet, exact, and spacious. The layout uses four horizontal bands rather than a mosaic of cards:

- **Signal rail** — the six numbers a user checks first;
- **Brief and action** — the one issue that deserves attention first;
- **Inbox and live work** — current customer conversations and meaningful activity;
- **System status** — whether supporting systems are working as expected.

### Signature element: the signal rail

The top rail is intentionally almost brutal in its simplicity:

**Inbox · Reach · Response · Spend · Leads · Revenue**

Each item has one label, one value, and one short qualifier. There are no charts, icons, trend arrows, comparison badges, or configurable metrics in the rail.

The largest text is a deterministic sentence, not a KPI:

> **Three Leads need a response. One Platform Run needs attention.**

When no action is required:

> **You are caught up. Three Advertisements are live.**

## 4. Visual system

### Palette

| Token     | Hex       | Purpose                         |
| --------- | --------- | ------------------------------- |
| Midnight  | `#181A28` | Brief band, primary type        |
| Slate     | `#5B6072` | Secondary text                  |
| Pearl     | `#F6F7F9` | Page ground                     |
| Rule      | `#DDE0E7` | Dividers and rail cells         |
| Signal    | `#4666E5` | Current selection, links, focus |
| Attention | `#B97830` | Due or degraded state only      |

Use the existing destructive token for confirmed failures. Healthy states should be communicated mainly through text and contrast, not green decoration.

### Typography

- **Interface:** `Söhne`, 400–600, with `Inter` as the production fallback.
- **Data:** `Berkeley Mono`, 400–500, with `IBM Plex Mono` as the production fallback.

Use the mono face only for times, status, money, and tabular counts. If licensed fonts are unavailable, ship the fallbacks.

### Type and form

| Role            | Size / line-height |
| --------------- | ------------------ |
| Daily brief     | `38/1.08`          |
| Section heading | `17/1.25`          |
| Primary value   | `26/1.0`, tabular  |
| Body            | `14/1.5`           |
| Utility         | `11/1.3`           |

- Use the existing `max-w-7xl` shell and a 12-column grid.
- Prefer rules and tonal fields to nested cards, shadows, or glass.
- Use `2–6px` radii and a `4px` spacing base.
- Keep icons to system identification; actions use clear text.
- Preserve generous negative space around the brief and first action.

## 5. Desktop composition

The signal rail, brief, Inbox preview, opening Live work items, and system status should fit within a typical `1440 × 900` viewport.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Riverside Auto                                      UPDATED 8:42 AM  [↻]  │
├────────────┬───────────┬───────────┬───────────┬───────────┬───────────────┤
│ INBOX      │ REACH     │ RESPONSE  │ SPEND     │ LEADS     │ REVENUE       │
│ 4 waiting  │ 2.1k      │ +2        │ $4,850    │ 24        │ $7.1k         │
│ oldest 18m │ today     │ today     │ today     │ today     │ today         │
├────────────────────────────────────────────────────────────────────────────┤
│ Three Leads need a response.                         [Review oldest Lead] │
├──────────────────────────────────┬─────────────────────────────────────────┤
│ INBOX · 4 WAITING                │ LIVE WORK                               │
│                                  │                                         │
│ MESSAGE · Jane Smith             │ PERSON · 6m                             │
│ Can you come Friday afternoon?   │ Sarah Cole submitted “Request a quote” │
│ 18m                      [Reply]  │                                         │
│                                  │ BUSINESS · 14m                          │
│ MESSAGE · Chris Bell             │ Meta Feed Run was paused by Maya        │
│ Thanks — send me the estimate.   │                                         │
│ 42m                      [Reply]  │ NEEDS ATTENTION · 21m                   │
│                                  │ Shopify import has 2 identity matches   │
│ LEAD · Sarah Cole · Facebook     │ to resolve                    [Review]  │
│ 1h                       [Reply]  │                                         │
│                                  │ PERSON · 28m                            │
│ View all 4                       │ Sale recorded · Chris Bell · $1,450    │
│                                  │                              View more  │
├────────────────────────────────────────────────────────────────────────────┤
│ SYSTEM STATUS                                                              │
│ CRM Current · Messages 1 failed · Pages 3 published · Automations 4 due   │
└────────────────────────────────────────────────────────────────────────────┘
```

The wireframe defines hierarchy, not final density. The live page should use more vertical breathing room and fewer visible borders.

## 6. Page anatomy

### 6.1 Context bar

Show the Business name, local date, **Updated [time]**, and refresh. All rail values use the Business's local day.

### 6.2 Business signal rail

`BusinessSignalRail` is a core reusable component, not a configurable KPI grid. Its labels, order, and meanings are fixed:

| Signal   | Value       | Qualifier    | Meaning                                                    |
| -------- | ----------- | ------------ | ---------------------------------------------------------- |
| Inbox    | `4 waiting` | `oldest 18m` | unresolved inbound customer Interactions                   |
| Reach    | `2.1k`      | `today`      | recorded Message deliveries plus Advertisement impressions |
| Response | `+2`        | `today`      | inbound reply Interactions received                        |
| Spend    | `$4,850`    | `today`      | Platform Run spend recorded for the day                    |
| Leads    | `24`        | `today`      | Leads created                                              |
| Revenue  | `$7.1k`     | `today`      | active Sale value recorded, excluding reversals            |

The component accepts fixed semantic fields rather than an arbitrary metrics array. Every cell may link to its owning filtered surface, but the whole rail must remain readable without interaction.

Use tabular numerals, equal-width cells, 1px internal rules, and no surrounding card chrome. Loading preserves all six cell dimensions. An unavailable value displays `—` with a qualifier such as **not reported**, never `0`.

### 6.3 Daily brief

The brief contains one sentence and, when needed, one primary action. Priority order:

1. failed or invalid Platform Runs, sends, or Automations;
2. unanswered customer Interactions;
3. new Leads without a first action;
4. due follow-ups;
5. pending approvals;
6. all caught up.

The rail already carries today's position, so the brief must not repeat those six values. The linked event also remains visible in Inbox or Live work; the brief is only its priority treatment.

### 6.4 Inbox preview

`InboxPreview` shows actual waiting customer work, not another summary count. Display the oldest three items:

- type: **Message** or **Lead**;
- Contact name;
- one-line message excerpt or source context;
- waiting time;
- **Reply** or **Review Lead** action.

```text
INBOX · 4 WAITING

MESSAGE · Jane Smith
Can you come Friday afternoon?
18m                                      [Reply]

MESSAGE · Chris Bell
Thanks — send me the estimate.
42m                                      [Reply]

LEAD · Sarah Cole
from Facebook
1h                                       [Reply]

View all 4
```

The full row links to the Contact timeline. The action opens the exact reply or Lead workflow. Do not show a **Reply** action when the item has no reply-capable channel; use **Review Lead** instead.

### 6.5 Live work

`OperatingFeed` is a reverse-chronological feed of meaningful events from across LOOPIE. Every event belongs to one of three user-facing classes:

| Class               | Include                                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Person**          | replied, submitted a form, became a Contact or Lead, created an attributed session that became a Lead, purchased through Shopify, or responded to outreach                                                        |
| **Business**        | scheduled/sent a Message, published a Page, started/paused an Advertisement or Platform Run, changed a Lead or follow-up state, recorded a Sale, imported a HubSpot deal, or completed another useful import/sync |
| **Needs attention** | connector failure, Platform Run failure, import conflict, unresolved identity match, failed Message, failed follow-up, or partial sync                                                                            |

Each row contains a class label, plain-language event, Contact or object name, source when useful, relative time, and an action only when one exists.

Show eight events, then **View more activity**. Keep the ordering chronological; the daily brief separately promotes the most important unresolved event.

Normalize related writes into one human event. A form submission that creates a Contact and Lead should read **Sarah Cole submitted “Request a quote” and became a Lead**, not occupy three rows. Summarize batch operations as one result, such as **Shopify added 12 Contacts and 3 Sales**.

Omit low-value telemetry:

- Page views and raw impressions;
- standalone Ad clicks or attributed sessions that produced no CRM state;
- background sync started/completed events with no result or exception;
- autosaves and polling;
- internal retries that resolved without user impact.

Clicks may appear only when they produce meaningful state, such as a new attributed Lead. Successful syncs appear only as a useful result, such as **Shopify added 12 Contacts and 3 Sales**. Detailed telemetry remains in analytics or audit history.

### 6.6 System status

Use one restrained status line for supporting systems:

- **CRM** — open Leads and unanswered Interactions;
- **Messages** — scheduled, sent, or failed;
- **Pages** — published and collecting forms;
- **Automations** — active, due, or failed;
- **Attribution** — known versus unknown Lead and Sale sources;
- **Billing** — role-gated funding or payout issues.

Allowed states are **Current**, **Attention**, **Degraded**, **Disconnected**, **Quiet**, and **Not set up**. Never say a system is healthy when LOOPIE cannot verify it.

Click the state to open the owning surface or affected record.

## 7. Prioritization model

The daily brief selects one unresolved event deterministically:

1. delivery, data-integrity, or Platform Run failures;
2. unanswered customer Interactions;
3. new Leads with no first Interaction;
4. overdue follow-ups;
5. pending approvals tied to scheduled work;
6. repeated Automation failures;
7. overdue Lead stage or Sale updates;
8. setup guidance when no live work is waiting.

Ties prefer the oldest customer-facing event, then higher estimated Lead value. A person waiting for a response always ranks above optimization advice.

Inbox is ordered by waiting time. Live work remains reverse chronological and is never silently rearranged by importance. There is no composite health score.

## 8. Data contract

### Implemented now

`GET /home` returns the Business-local signal rail, exact waiting Inbox work, a ranked primary action, normalized operating activity, and verifiable system states. It also retains the previous summary counts for compatibility.

`GET /results` returns spend, Leads, Sales, revenue, views, clicks, and results by source. Its current response still includes legacy Deployment records alongside Ad Runs. Home must normalize these as **Platform Runs** and never expose Campaign or Deployment labels.

Inbox replies are unresolved only when the Contact's latest conversation Interaction is inbound. A new Lead is waiting only when it has no later outbound Interaction.

The client supplies its UTC offset so daily values share one local-day boundary. Reach uses recorded outbound Message Interactions; LOOPIE does not infer daily Advertisement impressions from all-time counters.

Existing `Interaction`, `FormSubmission`, `Lead`, `Sale`, `Message`, `AttributionEvent`, `ImportJob`, integration, and external-match records can supply much of Inbox and Live work. Some status changes are represented only by current state, so they cannot be presented as historical events until a durable transition record exists.

### Response shape

The implemented `GET /home` response is:

```ts
type HomeOverview = {
  generatedAt: string
  rail: {
    localDate: string
    timezone: string
    currency: string
    inboxWaiting: number
    inboxOldestAt?: string
    reach: number
    responses: number
    spend: number
    leads: number
    revenue: number
  }
  primaryAction?: {
    id: string
    title: string
    reason: string
    actionLabel: string
    href: string
  }
  inbox: {
    totalWaiting: number
    items: Array<{
      id: string
      kind: 'MESSAGE' | 'LEAD'
      contactName: string
      preview?: string
      sourceLabel?: string
      waitingSince: string
      actionLabel: 'Reply' | 'Review Lead'
      href: string
    }>
  }
  activity: {
    items: Array<{
      id: string
      category: 'PERSON' | 'BUSINESS' | 'NEEDS_ATTENTION'
      eventType: string
      text: string
      detail?: string
      occurredAt: string
      sourceLabel?: string
      objectType: string
      objectId: string
      actionLabel?: string
      href: string
    }>
  }
  systems: Array<{
    id: 'crm' | 'messages' | 'pages' | 'automations' | 'connections'
    state: 'CURRENT' | 'ATTENTION' | 'DEGRADED' | 'DISCONNECTED' | 'QUIET' | 'NOT_SET_UP'
    detail: string
    href: string
  }>
}
```

The API returns facts, one primary-action ranking, and destinations—not colors or layout instructions. The first response is capped at 16 normalized events; the page reveals them eight at a time.

## 9. Release plan

### Release 1 — rail, Inbox, and current activity (implemented)

- Add Business-local daily aggregation for all six rail values.
- Build `BusinessSignalRail` with desktop and mobile-widget stories.
- Add an exact unresolved-Inbox query and build `InboxPreview`.
- Normalize meaningful existing records into `OperatingFeed` items.
- Derive the brief and primary action from unresolved work.
- Only verifiable supporting-system states.
- Honest loading, partial-error, and stale-data states.

### Release 2 — actionable overview

- Add durable events where status transitions or sync results are not retained today.
- Add cursor-based incremental refresh and direct object links.
- Include connector/import exceptions, identity matches, commerce orders, and CRM deals.
- Add pending approvals, overdue Sale updates, and attribution coverage.

Do not show names, trends, live sync, or health claims before the underlying data supports them.

## 10. States and edge cases

### All clear

> You are caught up. Three Advertisements are live and the next follow-up runs at 2:30 PM.

Inbox shows **No replies waiting**. Live work continues to show recent meaningful activity; an all-clear state does not make the business look inactive.

### New account

Offer two clear starting paths:

- **Create an Advertisement** — add Media, then configure a Platform Run.
- **Set up CRM** — import Contacts, review Leads, and prepare the first Message.

Inbox explains how replies will appear. Live work begins with useful setup and import results. Do not show zero-filled charts.

### Partial or stale data

Keep successful sections visible. State whether Inbox or Live work could not update and retain the last successful timestamp. Manually recorded Platform Run data must show its freshness.

### Large workload

Inbox shows the oldest three and a total. Live work shows the latest eight. Messages, CRM, Advertisements, and integration detail remain the places for filtering and bulk work.

## 11. Responsive behavior

### Desktop

- Render the rail as six equal columns directly below the context bar.
- Inbox occupies four columns; Live work occupies eight.
- System status uses the full width.

### Tablet

- Keep six columns while each cell remains legible; otherwise use the mobile 3×2 layout.
- Stack Live work after Inbox.

### Mobile

- Render the rail as a reusable 3×2 widget: Inbox, Reach, Response / Spend, Leads, Revenue.
- Keep the fixed order; do not turn it into a carousel or horizontal scroller.
- Order: rail → brief → Inbox → Live work → system status.
- Use full-width system rows, not horizontal carousels.
- Respect the existing bottom navigation and safe-area inset.

## 12. Interaction and motion

- Refresh values in place without replaying page-entry animation.
- Update rail values without count-up animation or layout movement.
- When new feed items arrive, show **New activity** above the feed; insert them only when the user activates it or refreshes.
- Resolving an Inbox item removes it with a `160–220ms` fade/collapse and updates the rail count.
- Use no animated counters, pulsing states, chart drawing, or ambient movement.
- Under `prefers-reduced-motion`, update without spatial transitions.

## 13. Accessibility

- Use one `h1` for the brief and real headings for each band.
- Pair every severity and status color with text.
- Use tabular numerals and provide full accessible values for abbreviations.
- Implement the rail as a labeled `<dl>`; announce `2.1k` as “2,100” and `18m` as “18 minutes.”
- Implement Inbox and Live work as labeled lists with a meaningful heading for each event.
- Label links by destination: **Open Jane Smith**, not repeated **View**.
- Keep controls at least `44 × 44px` with visible focus.
- Announce refresh failure and Inbox changes without moving focus. Do not announce every incoming feed event automatically.

## 14. Guardrails

- No Campaign or Deployment terminology in the Home UI.
- Do not rename, reorder, add, or remove rail signals by context.
- No icons, charts, trend arrows, or comparison badges inside the rail.
- No generic business-health score.
- No metric without a decision or destination.
- No unsupported real-time or sync language.
- No false system-health claims.
- No recommendation without an inspectable reason.
- No more than one primary action.
- No Page views, raw impressions, every-click events, autosaves, polling, or routine background-sync events in Live work.
- A sync result appears only when it changed records or needs attention.
- Every feed item must resolve to persisted work with a stable ID and timestamp; never generate illustrative activity in production.
- Collapse one causal chain or batch operation into one useful event.
- “Live” means recent, refreshable operating activity; do not imply a streaming connection unless one exists.
- No nested card grid, decorative chart, gradient, or glass panel.
- Detailed Advertisement and CRM analysis remains in those surfaces.

## 15. Acceptance criteria

The redesigned Home is ready when:

- the highest-priority action is identifiable within five seconds;
- Advertisements, Platform Runs, Contacts, Leads, Interactions, and Sales use current nouns consistently;
- the brief matches visible records or counts;
- the rail always reads Inbox · Reach · Response · Spend · Leads · Revenue;
- every rail value uses the Business-local day and its documented meaning;
- every action opens its object or a correctly filtered list;
- the Inbox shows real waiting Contacts with message context and direct actions;
- Live work shows actual Person, Business, and Needs attention events;
- every feed event links back to its persisted source object when that object has a user-facing route;
- low-value telemetry never appears in Live work;
- the signal rail, Inbox, and first Live work events are visible in the first laptop viewport;
- historical totals and current exceptions cannot be confused;
- manually recorded platform data shows freshness;
- partial API failure does not replace the whole page;
- the new-account state offers an Ad-first and CRM-first starting path;
- keyboard, mobile, reduced-motion, and 200%-zoom behavior remain complete;
- the same rail component works as a 3×2 mobile widget without semantic changes;
- the page reads as one designed instrument, not a grid of dashboard cards.

## 16. Recommended next boundary

The next backend investment is durable operating events for transitions that cannot currently be reconstructed, followed by cursor-based incremental refresh. Legacy result sources remain normalized behind the API so Home speaks only in current product language.
