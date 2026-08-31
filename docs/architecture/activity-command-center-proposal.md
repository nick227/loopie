# LOOPIE Activity Command Center — Product and Architecture Proposal

**Status:** Proposed  
**Surface:** Activity (evolution of Messages)  
**Primary route:** `/activity` (`/messages` remains a compatibility route during migration)  
**Audience:** Small-business owners, managers, and staff operating customer acquisition, communication, fulfillment, and connected systems  
**Primary job:** See, understand, act on, and communicate about everything happening in the business from one stream

## 1. Executive decision

The current Messages surface should become LOOPIE's **Activity command center**: the chronological operating record of the business and the primary place to act on what happens next. Human email and SMS are important, but they are one category within a much larger stream of advertising, acquisition, customer, commerce, automation, publishing, integration, and communication activity.

This is a deliberate expansion and renaming of the current Messages concept. Today, LOOPIE treats a Message primarily as an outbound send to an Audience. The proposed surface uses one top-level concept:

> **Activity** — a time-ordered stream of meaningful things that happened, are happening, are scheduled, or need action.

An Activity item may represent an ad click, attributed visit, page view, form submission, new Lead, Lead status change, ad/run state change, page publish, Shopify order, HubSpot deal, payment, Sale, automation result, integration sync, identity-match problem, personal message, or Broadcast. The **source is a property of the item**, not a reason to send the user to a separate stream.

The surface unifies these for the user without forcing them into one database object. A reply remains an Interaction, a Sale remains a Sale, a provider event remains an ExternalEvent, and a Broadcast remains a communication record. The command center uses a normalized Activity presentation and query layer over those records.

This resolves the core product tension:

> Everything important can be read in Activity. The source and type explain what each item is; filters create focused views when needed.

“Inbox” may remain an onboarding synonym or a saved **Needs action** view, but it is not the primary information architecture. LOOPIE should not ask users to decide whether something belongs to Inbox, Activity, or Conversations before they can understand it.

## 2. What exists today

The repository already contains useful pieces, but they do not yet form a command center.

| Area                   | Present capability                                                                                                        | Current limitation                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Messages list          | `/messages` lists real Message records with channel, status, date, and pagination                                         | It is an outbound object list, not an inbox; no search, useful filters, assignment, unread state, priority, or conversation grouping                             |
| Message model          | `EMAIL`, `TEXT`, and generic `SOCIAL`; `DRAFT`, `SCHEDULED`, `SENT`, `FAILED`; optional Template and Automation links     | No direction, provider account, thread, recipient delivery, inbound body, attachments, read/resolution state, sender, or per-recipient status                    |
| Composer               | Generated create screen and two unused broadcast prototypes                                                               | The active screen does not match the API contract, contains placeholder audiences, logs a fake autosave, and does not perform create/send/schedule actions       |
| Inbox prototype        | Sidebar, flat inbox list, composer, and wizard components exist                                                           | They are not mounted; counts and Audiences are mock data; the list assumes outbound Message records can represent inbound mail                                   |
| Detail and performance | Routes and SDK hooks exist                                                                                                | Both active pages render raw JSON; delivery/open/click/unsubscribe are placeholders because providers and webhooks are not wired                                 |
| Sending                | Service resolves an Audience, records outbound Interactions, and marks a Message sent atomically                          | No real email, SMS, or social delivery provider is connected; test send is a no-op; scheduled records are stored but no message scheduler is evident             |
| Templates              | Template model supports channel, purpose, subject, body, CTA, media, personalization tokens, and suggested Audience       | Template pages are raw JSON and templates are not integrated into the active composer; no starter catalog, ownership/source, approval, or performance history    |
| Automation             | Trigger/condition/action model, pending runs, executor, logs, pause/resume, and source-agnostic Lead trigger exist        | Automation is a separate generated area; message composition does not expose the promised simple follow-up control; branching and content lifecycle remain basic |
| Customer activity      | Interaction records cover sends, replies, notes, calls, status changes, sales, forms, and ad activity                     | Reply is a generic Interaction and depends on metadata for content; there is no durable Conversation/Thread or channel identity model                            |
| External events        | CRM/commerce events are ingested idempotently and can create Notes or Sales                                               | Event types are limited and not exposed through a dedicated unified activity query for Messages                                                                  |
| Home                   | Home already shows waiting replies, new Leads, meaningful events, failures, and system status                             | It is a three-item operational preview linking mostly to Contact detail, not a work queue or reply surface                                                       |
| Navigation             | Messages is a top-level destination; Contacts, Audiences, Templates, Automations, and Performance are intended beneath it | The current Shell and route structure do not yet provide that nested command-center navigation                                                                   |

### Assessment

The backend has a promising **business event spine** and the frontend already contains a small operating feed plus fragments of an inbox. The primary missing layer is a first-class Activity read model: source/type normalization, promotion and rollup policy, cross-domain attention state, unified search, and polymorphic item inspection. A durable communication domain—provider accounts, addressable identities, Conversations, Message items, and delivery events—is a necessary category within that larger Activity architecture.

The current `Message` model should be treated as a useful V0 Broadcast definition, not stretched until it represents every Activity item or even every provider-level personal Message.

## 3. Product principles

### 3.1 One stream; filters provide the modes

The user should never need to choose among “Inbox,” “Activity,” and “Conversations” to discover what happened. Activity is the single default stream. Search, filters, and saved views produce focused lenses such as **Needs action**, **People**, **Ads**, **Pages**, **Messages**, **Automations**, or **Failures**.

Broadcast composition, Templates, scheduling, and automation management remain tools attached to the stream. Their output and state changes return to Activity.

### 3.2 The item is primary; source and type are properties

Every visible row follows one consistent Activity grammar:

```text
[source] [type] [plain-language event] [person/object] [status] [time] [action]
```

A Message is not a special navigation silo. It is an Activity item whose type is Message and whose source may be Email, SMS, WhatsApp, Instagram, or another connected ChannelAccount. Likewise, a Sale item may come from LOOPIE, Shopify, Square, or HubSpot. Source badges explain provenance without fragmenting the timeline.

Contacts remain the stable identity where a person is involved. Provider threads remain separately auditable, but conversation grouping is a contextual view reached by selecting a person or Message—not the architecture of the whole surface.

### 3.3 System activity is first-class

System-generated business activity is expected to dominate volume. It must not look secondary to human communication. Meaningful events use the same row anatomy and action model as messages:

> **System · 10:42 AM**  
> Maya became a Lead after submitting “Free estimate.”

> **Automation · 2:00 PM**  
> Sent “Estimate reminder” by text because no reply was received after 2 days.

> **Square · 4:18 PM**  
> Payment received · $850 · Fence repair

Human-authored and system-generated items are distinguishable by actor and type, not by putting them in different products. Actions are item-specific: reply, inspect, retry, resolve match, pause run, view Lead, or no action.

### 3.4 High volume becomes signal, not noise

Activity is not a raw event log. LOOPIE applies three display levels:

1. **Promote** items that need action or create meaningful business state: a form submission, new Lead, payment, failed run, failed automation, unresolved identity match, reply, or failed Broadcast.
2. **Show** useful state changes individually when volume is reasonable: page published, Lead stage changed, ad/run started or paused, Sale recorded or reversed.
3. **Roll up** repetitive telemetry into inspectable summary items: **Meta Ad “Summer Service” received 184 clicks and 129 attributed visits in the last hour**. Individual clicks and views remain queryable and available in detail, but do not consume 313 rows in the primary stream or require full-text search indexing individually.

Aggregation uses source, type, related object, and a fixed time window. A child that needs action or creates a Lead, Sale, payment, reply, failure, or other promoted state appears separately and is excluded from the informational rollup. Existing rollups do not break apart or move unpredictably after the user has read them. Users can choose **Show every event** for audit work.

Default treatment for likely high-volume items:

| Activity                               | Default stream treatment                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ad click / attributed visit            | Roll up by Ad + Source + time window; promote when it produces a Lead or unusual issue      |
| Landing Page view                      | Roll up by Page + time window                                                               |
| Form submission                        | Show individually; promote when it creates or updates a Lead                                |
| New Lead                               | Promote and mark Needs action until acknowledged or contacted                               |
| Lead status changed                    | Show individually; group batch changes                                                      |
| Ad/Run started or paused               | Show individually; combine deliberate batch operations                                      |
| Ad/Run failed or needs attention       | Promote and mark Needs action                                                               |
| Page published or Form changed         | Show individually; combine rapid edits into one revision summary                            |
| Shopify order / HubSpot deal / payment | Show individually; promote failures, reversals, and unmatched people                        |
| Sale recorded or reversed              | Show individually; reversal is Needs action when follow-up or reconciliation is required    |
| Automation executed                    | Roll up repeated successes by rule; keep the Contact-level action in that Contact's history |
| Automation skipped                     | Roll up expected skips; show unusual skip reasons; promote policy/configuration problems    |
| Automation failed                      | Promote and mark Needs action                                                               |
| Integration sync completed             | Roll up as one result summary with useful counts                                            |
| Integration sync failed                | Promote and mark Needs action                                                               |
| Unresolved CRM identity match          | Promote and mark Needs action                                                               |
| Personal Message or reply              | Show individually; inbound reply is Needs action unless handled automatically               |
| Broadcast sent                         | Show one Broadcast summary with recipient drill-down                                        |
| Broadcast failed                       | Promote the Broadcast summary; expose affected recipients in detail                         |

### 3.5 One business story, not one row per database write

Activity normalizes causally related records into the business event a user recognizes. A FormSubmission that creates a Contact and Lead is one story:

> Maya Chen submitted “Free estimate” and became a Lead.

It is not three adjacent rows for Contact created, Form submitted, and Lead created. Likewise, a Shopify order, payment, LOOPIE Sale, and automation trigger may become one story with expandable evidence when they describe the same business occurrence.

Canonical records remain separate. Correlation, causation, provider identifiers, and an explicit normalization rule connect them in the Activity projection. A later reversal or failure remains a new Activity item because it changes the meaning and may require action.

### 3.6 Start simple, reveal depth in place

The default view answers: **What happened? What needs action? What is scheduled next? What produced a business outcome?** Advanced filters, automation details, recipient diagnostics, attribution, and raw event children open progressively without sending the user to an unrelated dashboard.

### 3.7 Sending confidence is part of composing

Before send or schedule, show eligible recipients, suppressed recipients, missing channel data, consent state, local send time, estimated segments, personalization fallbacks, and the exact recipient preview. A large send must never be a blind button press.

### 3.8 Metrics must lead to action

Every metric should answer a business question and link to the people or messages behind it. “23 replies” opens those conversations. “4 Sales” opens the attributed Sales. A chart without an inspectable population does not belong here.

## 4. Information architecture

Activity becomes a persistent workspace rather than a set of competing inbox, conversation, and event destinations.

```text
Activity
├── All activity                 default stream
├── Needs action                 saved system view
├── Saved views                  user/team-defined filter sets
│   ├── People
│   ├── Ads needing attention
│   ├── Page and form activity
│   ├── Orders and payments
│   └── Message replies
└── Manage
    ├── Scheduled
    ├── Broadcasts
    ├── Templates
    ├── Automations
    ├── Audiences
    ├── Contacts
    └── Performance
```

Only **All activity** and **Needs action** are fixed primary views. The other example views are saved filter configurations, not permanent product sections. This prevents the navigation from becoming a mirror of every backend entity.

`Scheduled` may use a calendar or list presentation, but scheduled items also appear in the main Activity stream at creation, change, execution, cancellation, and failure.

Primary create control:

```text
[ Create ▾ ]
  Personal message
  Broadcast
  Start from template
```

“Newsletter” and “Coupon” are template purposes or starter flows, not new top-level object types.

## 5. Core desktop experience

The signature interaction is a **live business ledger**: one chronological stream where every row uses the same structural grammar, while source, type, actor, status, and available action make different events instantly legible. The visual risk is refusing the familiar mailbox/chat layout in favor of a dense but calm operational timeline designed for LOOPIE's actual event mix.

```text
┌──────────────────┬───────────────────────────────────────────────────────────────┐
│ ACTIVITY         │ Activity                                      Today · Live     │
│                  │ [ Search activity, people, ads, pages...                  ]   │
│ [ Create ▾ ]     │ [Source ▾] [Type ▾] [Person ▾] [Ad ▾] [Page ▾] [Status ▾] │
│                  │ [Needs action] [Date ▾]                         [Save view]   │
│ All activity     │───────────────────────────────────────────────────────────────│
│ Needs action  7  │ 10:42  WEBSITE · FORM                                      │
│                  │        Maya Chen submitted “Free estimate” and became a Lead │
│ SAVED VIEWS      │        Riverside service page                 [View Lead]     │
│ People           │                                                               │
│ Ads attention  2 │ 10:39  META · ATTRIBUTION                                   │
│ Orders           │        Summer Service received 184 clicks and 129 visits     │
│ Message replies 4│        in the last hour                         [Inspect]      │
│                  │                                                               │
│ MANAGE           │ 10:28  SHOPIFY · PAYMENT                                    │
│ Scheduled        │        Payment received · Chris Bell · $850      [View Sale]  │
│ Broadcasts       │                                                               │
│ Templates        │ 10:11  SMS · MESSAGE                               REPLY      │
│ Automations      │        Jane Smith: “Can you come Friday morning?” [Reply]     │
│ Audiences        │                                                               │
│ Contacts         │ 09:56  META · AD RUN                            NEEDS ACTION │
│ Performance      │        Retargeting run failed validation             [Fix]   │
└──────────────────┴───────────────────────────────────────────────────────────────┘
```

Selecting any item opens an inspector panel without replacing the stream. The inspector is polymorphic: a Message shows its thread and reply composer; a Lead shows Contact context and stage controls; an ad/run failure shows diagnostics and corrective action; a rollup shows its underlying events and metrics.

### Responsive behavior

- **Desktop:** navigation rail, main Activity stream, and an on-demand item inspector.
- **Tablet:** navigation collapses; stream and inspector remain two panes.
- **Mobile:** one pane at a time with preserved search/filter state; Message items gain a sticky reply composer only when selected.
- Opening any object never discards the stream position. Back returns to the same filter, item, and scroll offset.

## 6. Activity and work management

### Immutable Activity; mutable attention

Activity records what happened and does not become “resolved.” When an event requires work, LOOPIE creates or updates a separate `AttentionItem` that may link one or more related Activity items. This prevents mutable queue state from rewriting history and lets repeated failures update one continuing issue instead of creating five unrelated tasks.

Every Activity item declares whether it is informational, action-required, or a failure at projection time. An associated AttentionItem uses a small shared work-state model:

- **Needs action**
- **In progress**
- **Snoozed until…**
- **Resolved**

AttentionItems may also have an assignee, team, priority, due time, and tags. Seen/unseen is personal state on Activity; action status, assignment, and resolution belong to the shared business workspace. Informational items never require users to “clear an inbox.”

Examples:

- Repeated failures from one ad run update one assignable issue while every failure remains in Activity.
- An unresolved CRM identity match has one AttentionItem linked to the match event and later resolution event.
- A new Lead can have an AttentionItem until contacted or deliberately closed.
- A sync completion is informational; a sync failure needs action.
- A page view is informational and normally part of a rollup.

### Message-specific state

When the selected Activity item is a human Message, its Conversation also has communication-specific state independent of read state:

- **Open / needs reply**
- **Waiting on customer**
- **Snoozed until…**
- **Resolved**
- **Spam**

It may also have a follow-up due time. These fields extend or synchronize with the common AttentionItem model rather than creating a separate Inbox product.

### Stream behavior

- Default sort: newest Activity first. The fixed **Needs action** view sorts by severity, then oldest unresolved item.
- Personal saved views may change sort/filter without changing shared work state.
- New events received while a user is reading do not jump the list or steal focus. Show **12 new items** and insert them when the user chooses or returns to the top.
- Provider events use the time they occurred for chronology and retain the time LOOPIE observed them. A late event appears in historical position, while a brief **Received late** marker and the new-items control ensure it is not missed.
- Collision awareness shows when another user is viewing or replying.
- Assignment, resolve, snooze, and tag work across compatible Activity types; mark spam is Message-specific.
- Sending a reply normally changes the state to **Waiting on customer**.
- A new inbound reply reopens a resolved or waiting Conversation.
- Failed outbound delivery keeps the Conversation open and explains the next action.
- A related system event does not reopen a resolved AttentionItem unless an explicit rule says that event requires new action.

### Contextual inspector

The right-side inspector adapts to the selected item but preserves a consistent source, status, time, related objects, and action structure. A person-related item shows identity and channel eligibility, Lead stage, recent Sales, open tasks, Audience membership, source, and recent history. An ad/page/integration item shows its relevant configuration and diagnostics. Full editing remains available through linked detail views.

## 7. Broadcasts and mass communication

A Broadcast is an authored communication sent to an Audience over one or more compatible channels. Email, text, social publishing, and future push channels share planning and measurement but retain channel-specific content variants.

### Recommended broadcast flow

Keep the earlier messaging UX principle: avoid a wizard unless a provider or legal requirement forces one. Use a single canvas with a sticky summary:

1. **Who should get this?** Audience, exclusions, eligibility, estimated count.
2. **How should it reach them?** One or more channels and sending identities.
3. **What should it say?** Template or blank draft, channel variants, personalization, media, CTA.
4. **When should it go?** Now, one scheduled time, or recipient-local optimized time later.
5. **Follow up automatically** — off by default, visible when enabled.
6. **Review** — previews, test send, compliance, suppression, and final recipient count.

### Scheduling

The Calendar combines Broadcasts, personal scheduled messages, automation actions, and relevant business events. It supports timezone-aware day/week/list views, drag-to-reschedule where safe, pause/cancel, and conflict warnings.

Scheduling needs explicit states beyond the current Message status:

`DRAFT → SCHEDULED → QUEUED → SENDING → SENT | PARTIALLY_SENT | FAILED | CANCELED`

Per-recipient delivery continues independently:

`PENDING → ACCEPTED → DELIVERED | BOUNCED | FAILED | SUPPRESSED`

A Broadcast is “Sent” only as a summary; recipient delivery records are the source of truth.

### Safety and compliance

- Enforce email and SMS consent independently.
- Maintain global and channel-specific suppression lists.
- Include unsubscribe/STOP handling and provider-required sender identity.
- Quiet hours and timezone policy are explicit.
- Large sends support role-based approval and a short cancel window before dispatch.
- Editing a scheduled Broadcast creates a revision; sent content is immutable.
- Retries must be idempotent at recipient + Broadcast revision + channel.

## 8. Templates and starter messages

Call the feature **Templates** in navigation and **Start from template** in composition. “Starter messages” is helpful onboarding language, not a second object.

### Starter catalog for small businesses

Organize around recognizable jobs, not content taxonomy:

- Welcome a new Lead
- Reply to a quote request
- Confirm or remind an appointment
- Follow up after no response
- Ask for a review
- Thank a customer
- Win back past customers
- Send a newsletter
- Announce an event or closure
- Offer a coupon
- Follow up after purchase
- Share a seasonal promotion

Each starter includes purpose, compatible channels, editable content variants, safe personalization defaults, suggested Audience, suggested timing, optional follow-up, required compliance elements, and a realistic preview.

### Sources and lifecycle

Every Template has a visible source:

- **LOOPIE starter** — maintained product default; duplicated before business customization.
- **Business template** — reusable within the account.
- **Saved message** — created from a successful past send.
- **Approved template** — locked or approval-gated for team use.

Editing content for one send never silently changes the source Template. Template analytics compare uses without attributing unrelated outcomes to the Template itself. Keep revision history so scheduled work does not change when a Template is later edited.

### Personalization

Tokens must define a fallback, preview against real eligible recipients, and fail preflight when a required value is absent. Prefer visible chips such as `First name` over raw `{{first_name}}` syntax in the main editor while retaining a deterministic underlying token format.

## 9. Automation in the command center

Preserve the existing plain-language rule: **Follow up automatically**. Most users should configure it directly beneath a personal message, Broadcast, or Template.

```text
Follow up automatically                         On
If they do not reply, wait [ 3 days ]
Then send [ Friendly reminder ▾ ] by [ Text ▾ ]
Stop when [ they reply ] or [ a Sale is recorded ]
```

The dedicated Automations view is for inspecting all active rules, queued actions, failures, and logs—not the only place automation can be created.

### Required behavior

- Triggers remain source-agnostic: a new Lead from a form, Campaign, import, or connected system can receive the same follow-up.
- Every automated message appears in its Conversation with an **Automation** author label and link to the rule.
- Queued actions appear on Calendar and in the Contact context.
- Users can skip one action, pause one Contact, pause a rule, or stop all future actions.
- Default stop conditions include reply, opt-out, Sale won, Lead lost, ineligible channel, or manual resolution.
- Logs record rule revision, trigger, condition result, content revision, Contact, provider attempt, outcome, and skip reason.

Start with the existing bounded trigger → wait → condition → action model. Add multi-step branching only after delivery, cancellation, and observability are trustworthy.

## 10. Search, filters, and saved views

Search spans Activity summaries and detail, Message content, Contact identity, Lead, ad/run name, Page or Form, Broadcast, phone/email, tags, Template, external order/deal/payment identifiers, and normalized identifiers supplied by connected Platforms. Raw provider payload JSON is never indexed wholesale.

The primary filter row is deliberately finite and matches the user's mental model:

> **Source · Type · Person · Ad · Page · Status · Needs action · Date**

These filters combine freely. Choosing a Person may reveal Message channel or Lead stage as contextual secondary filters; choosing Type = Message may reveal direction, delivery, and Broadcast; choosing Source = Meta may reveal account or run. Secondary filters do not permanently occupy the main toolbar.

### Filter vocabulary

| Primary filter | Meaning and examples                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source         | LOOPIE, Meta, Google, Website, Shopify, HubSpot, email account, SMS number, user, Automation                                                               |
| Type           | Click, visit, page view, form submission, Lead, status change, ad/run, publish, order, payment, Sale, automation, sync, identity match, Message, Broadcast |
| Person         | Contact, Lead, customer, assignee, Audience, tag                                                                                                           |
| Ad             | Advertisement, Campaign, Platform Run, creative, placement                                                                                                 |
| Page           | Landing Page, Form, published version                                                                                                                      |
| Status         | Domain-aware state such as sent, failed, paused, published, reversed, skipped, unresolved                                                                  |
| Needs action   | Yes/no plus assignee, priority, snoozed, resolved                                                                                                          |
| Date           | Occurred, scheduled, updated, resolved, relative or custom range                                                                                           |

Search and filters use one URL-addressable query model so views can be bookmarked and shared. Users can save views such as **Ads needing attention**, **New Leads today**, **Shopify payments**, **Unassigned message replies**, **Page changes**, or **Failed automations**. Provide count estimates before executing broad searches and cursor pagination for stable large result sets.

## 11. Metrics and insights

Activity is LOOPIE's cross-cutting metrics and insight entry point. Metrics follow the active Source, Type, Person, Ad, Page, Status, Needs action, and Date scope instead of living in an unrelated reporting silo. Communication performance is one specialized view within that model. Activity summarizes and routes; domain detail screens remain authoritative for configuration, finance, policy diagnostics, and deep performance analysis.

### Activity summary

The default Activity stream does not lead with a generic KPI strip; the stream itself is the product thesis. A compact summary may appear for the active view and date range:

`Needs action · People activity · Ad activity · Page activity · Messages · Revenue events`

Values and labels adapt to a saved view. A Message-reply view may show backlog and response time; an Ad view may show active runs, clicks, Leads, and failures; an Orders view may show orders, payments, reversals, and Revenue. Do not force communication metrics onto system activity or one fixed strip onto every filter set.

### Broadcast performance

- Intended, eligible, suppressed, attempted, accepted, delivered, bounced, failed
- Unique opens and clicks where technically reliable
- Replies, unsubscribes, spam complaints
- Leads, Sales, Revenue, and time-to-conversion
- Channel and Audience breakdowns
- Recipient-level drill-down for every count

Open metrics must be labeled as directional because privacy protections and image blocking make them incomplete. Delivery provider events must not be inferred from send records.

### Activity operations

- New Activity volume by Source and Type
- Action-required backlog by age, severity, source, and assignee
- Time to acknowledge and resolve actionable system events
- New inbound volume
- First-response time and resolution time
- Message backlog by age, channel, and assignee
- Reopened and unresolved Conversations
- Automation handoff and failure rate
- Reply-to-Lead and reply-to-Sale outcomes
- Click/visit → Lead → Sale progression
- Sync, identity-match, publishing, and ad/run failure rates

### Insight language

Use specific, evidence-backed observations:

> Appointment reminders sent 24 hours before the appointment received 18% fewer reschedule requests than reminders sent the same day.

Avoid opaque scores and unsupported causal claims. Every insight states the comparison window, population, and a link to inspect the underlying Activity and canonical records.

## 12. Proposed domain and read architecture

### Write-side records

Introduce clear durable concepts rather than continuing to overload `Message`:

| Concept                           | Responsibility                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChannelAccount`                  | Connected sending/receiving identity, provider, capabilities, health, credentials reference                                                  |
| `ContactChannelIdentity`          | Contact's provider-specific address or identity, normalized value, consent, reachability                                                     |
| `Conversation`                    | Business work container: Contact/provider thread linkage, state, assignee, priority, snooze, last activity                                   |
| `ConversationParticipant`         | Contact, staff, or external participant membership where channels require it                                                                 |
| `MessageItem`                     | One immutable inbound/outbound content item with direction, author, channel, timestamps, thread/provider ids                                 |
| `MessageContentRevision`          | Immutable authored content snapshot used by a scheduled or sent item                                                                         |
| `MessageAttachment`               | Shared Asset reference plus provider metadata                                                                                                |
| `DeliveryAttempt`                 | Per-recipient/provider attempt, status, timestamps, error category, idempotency key                                                          |
| `Broadcast`                       | Audience-level plan, scheduling policy, channel variants, lifecycle, revision                                                                |
| `BroadcastRecipient`              | Frozen eligible recipient/channel plan and its outcome                                                                                       |
| `AttentionItem`                   | Mutable work overlay linking one or more Activity/canonical records to assignment, priority, due time, snooze, resolution, and audit history |
| `ActivitySeenState`               | Per-user seen time for Activity or saved-view boundaries without mutating the shared event                                                   |
| `ConversationWorkState` or fields | Message-specific open/waiting/snoozed/resolved state and follow-up history                                                                   |
| `TemplateRevision`                | Immutable Template content and defaults used by sends and Automations                                                                        |

The existing `Message` can migrate into `Broadcast` or serve as a compatibility facade during rollout. Existing outbound Interactions remain part of the Contact timeline but new sends should point to the specific MessageItem and DeliveryAttempt that produced them.

### Unified activity read model

Create a normalized `ActivityItem` projection or query contract with:

```ts
type ActivityItem = {
  id: string
  businessId: string
  taxonomyVersion: string
  occurredAt: string
  observedAt: string
  projectedAt: string
  storyId: string
  source: {
    kind: 'LOOPIE' | 'PLATFORM' | 'WEBSITE' | 'CHANNEL' | 'USER' | 'AUTOMATION'
    id?: string
    label: string
    accountId?: string
  }
  type: string
  actor: { kind: 'CONTACT' | 'USER' | 'SYSTEM' | 'AUTOMATION'; id?: string; label: string }
  status?: string
  attention: 'INFORMATION' | 'ACTION_REQUIRED' | 'FAILURE'
  summary: string
  detail?: string
  references: {
    personId?: string
    leadId?: string
    adId?: string
    runId?: string
    pageId?: string
    formId?: string
    messageId?: string
    broadcastId?: string
    saleId?: string
  }
  aggregation?: { key: string; count: number; windowStart: string; windowEnd: string }
  attentionItem?: {
    id: string
    state: 'NEEDS_ACTION' | 'IN_PROGRESS' | 'SNOOZED' | 'RESOLVED'
    assigneeId?: string
    priority?: string
    dueAt?: string
    snoozedUntil?: string
  }
  actions: Array<{ id: string; label: string; href?: string; command?: string }>
}
```

This may initially be assembled from AttributionEvent, Page/Ad tracking, FormSubmission, MessageItem, Interaction, Lead, Sale, ExternalEvent, AutomationLog, integration sync state, publishing state, identity matches, and provider webhook records. At higher volume, project those writes into an indexed activity table or search store via an outbox. The projection is presentation infrastructure, not the canonical business ledger.

The contract deliberately makes `source` and `type` independent. `source = Shopify, type = Payment`; `source = Meta, type = AdRunFailed`; `source = SMS, type = Message`; and `source = LOOPIE, type = SaleReversed` all render through the same Activity item structure.

`type` is drawn from a LOOPIE-owned, versioned taxonomy—not copied directly from provider strings. Raw provider type and status remain available as evidence. Each taxonomy entry declares display copy, filter group, default promotion/rollup behavior, compatible references, attention rules, and inspector type. Taxonomy changes require migration or backward-compatible interpretation so saved views remain stable.

`storyId` groups causally related writes into one user-facing occurrence. Internal projection inputs also retain correlation id, causation id, provider event id, and a deterministic deduplication key even when those fields are not exposed by the public response.

### Volume and aggregation policy

- Canonical events remain individually queryable even when the default stream uses a rollup.
- Rollups are deterministic and use an `aggregation.key` derived from business, source, type, related object, and time window.
- Promoted child events are excluded from the informational rollup to prevent double counting in the visible stream.
- Counts and metrics query canonical events, never the number of rendered Activity rows.
- A user expanding a rollup receives cursor-paginated children with the same filters applied.
- Retention may differ between raw provider payloads, canonical events, and Activity search documents; policy must be explicit.

### Provider boundary

All channel adapters implement a common contract for connect, capability discovery, send, receive/webhook verification, status normalization, attachment mapping, thread mapping, unsubscribe handling, and health checks. Preserve the raw signed provider event for audit/replay, then normalize it idempotently.

Provider capabilities vary. The UI must derive controls from capability flags rather than pretending every channel supports subject lines, edits, typing indicators, scheduling, rich media, read receipts, or group messaging.

### Search and event delivery

- Write canonical records transactionally with an outbox event.
- Project the Activity stream, aggregation buckets, actionable counters, and search asynchronously.
- Use provider event id + ChannelAccount as inbound idempotency scope.
- Use stable sort `(occurredAt DESC, id DESC)` and cursor pagination; observed time powers late-arrival notices rather than rewriting chronology.
- Maintain a per-user observed-time checkpoint for the new-items query so an event that occurred yesterday but arrived now is not missed by an occurred-time cursor.
- Track projection lag and show a degraded state if fresh events cannot be indexed.
- Apply tenant isolation before search execution, not after retrieving results.
- Return actions only when the current user appears authorized, then re-check authorization and current canonical state when executing every command.

### Visibility, privacy, and retention

A cross-cutting stream can expose more than any single domain screen, so access control is part of projection—not a cosmetic client filter.

- Every Activity type declares required capabilities and field-level redaction rules.
- Financial amounts, Message bodies, Contact details, ad-account identifiers, and integration errors may have different visibility.
- Search documents contain normalized display/search fields only; raw webhook payloads, credentials, secrets, and unnecessary personal data are excluded.
- Export, bulk action, and saved-view sharing re-evaluate the recipient's permissions.
- Deleting or anonymizing a Contact updates searchable/display data while preserving the minimum legally required business/audit record.
- Raw event, canonical record, projection, search, and aggregate retention policies are explicit and independently enforceable.
- Access to sensitive Activity and execution of high-impact actions produce an audit record.

## 13. Visual direction

Activity should feel like a **live business ledger**, not a generic CRM card dashboard, developer event log, mailbox, or consumer chat clone.

### Palette

| Token           | Hex       | Use                                                     |
| --------------- | --------- | ------------------------------------------------------- |
| Midnight        | `#181A28` | Primary text and command surfaces                       |
| Paper           | `#F7F8FA` | Workspace ground                                        |
| Rule            | `#DDE0E7` | Pane and timeline structure                             |
| Signal blue     | `#4666E5` | Selection, links, focus, active filters                 |
| Origin teal     | `#297D78` | Person or external-system source marker, used sparingly |
| Attention amber | `#B97830` | Waiting, delayed, or degraded only                      |

Use existing semantic theme tokens in implementation; these values extend the established Home direction rather than creating a second design system.

### Typography and structure

- Existing interface face for reading and composition.
- Existing mono/data face for timestamps, channels, delivery states, and counts.
- Rules and pane structure instead of nested cards and shadows.
- Every item uses the same source → event → subject → status → time structure; selected Message items may expand into conversational layout in the inspector.
- Source and type use icon + plain text; never color alone.
- One orchestrated motion: resolving any actionable item returns it to chronological position and advances focus within **Needs action**. Respect reduced-motion settings.

## 14. Boundaries and non-goals

Activity is intentionally broad, but it must not absorb every product responsibility.

- It is not a raw audit log. Audit detail remains available from the canonical record or expanded evidence.
- It is not a universal task manager. AttentionItems exist only when business activity requires an accountable response.
- It is not the configuration screen for Ads, Pages, Contacts, Integrations, Automations, or finance. The inspector supplies context and direct actions, then links to authoritative detail when deeper editing is required.
- It is not a second Home dashboard. Home answers **What needs me now?** in one scan; Activity answers **What happened, and what do I want to inspect or act on?**
- It is not a notification-delivery system. Email, push, and SMS alerts may be generated from AttentionItems or watch rules, but Activity remains the in-product record.
- It does not promise that every raw event is retained or full-text indexed forever. Retention and search depth follow explicit policy.
- It does not manufacture causal claims. Correlated records may be presented as one story only when the normalization rule has sufficient evidence.

## 15. Delivery plan

### Phase 0 — Contract correction and product foundation

- Reconcile the active composer with the existing OpenAPI contract.
- Remove or integrate unused mock inbox/broadcast components.
- Make existing Message detail, Template, and performance pages intentional rather than raw JSON.
- Implement a real scheduler for current scheduled sends or explicitly disable scheduling until it exists.
- Define the normalized Activity contract, source/type taxonomy, promotion rules, rollup policy, and event normalization conventions.
- Define migration from `Message` to Broadcast/MessageItem without breaking existing routes.

**Exit:** current claims match actual behavior; no fake autosave, no no-op test send presented as working, and scheduled work has an accountable execution path.

### Phase 1 — Unified Activity stream

- Project current AttributionEvent, page/ad tracking, FormSubmission, Lead, Interaction, Sale, ExternalEvent, AutomationLog, integration, publishing, identity-match, and Message records into Activity items.
- Implement the versioned taxonomy, correlation/story normalization, promotion, fixed-window rollup, and **Needs action** rules for the highest-value types.
- Ship the stream, late-arrival/new-item behavior, polymorphic inspector, AttentionItem work state, seen state, and source/type/status visual grammar.
- Implement the primary filter set: Source, Type, Person, Ad, Page, Status, Needs action, and Date.
- Add URL-addressable queries and saved views.
- Make Home link to the exact Activity item or filtered view.

**Exit:** a team can understand and act on the business's system-generated activity from one stream without opening multiple domain dashboards.

Keep the first release deliberately bounded. Promote new Lead/form stories, Sales/payments/reversals, Message replies, ad/run failures, automation failures, sync failures, and identity matches. Show Lead status, ad/run lifecycle, Page publish, and Broadcast lifecycle. Roll up clicks, visits, Page views, successful automation executions, and successful syncs. Add new types only after their normalization, attention rule, permissions, and inspector are defined.

### Phase 2 — Human messaging, Broadcasts, Templates, and Calendar

- Add one email and one SMS provider end to end: connect, inbound webhook, send, delivery status, and opt-out.
- Add ChannelAccount, ContactChannelIdentity, Conversation, MessageItem, DeliveryAttempt, and Message-specific work state.
- Render personal Messages within Activity and open their thread/reply experience in the item inspector.
- Broadcast + frozen recipients + channel variants + recipient delivery state.
- Single-page composer with audience eligibility and preflight.
- Starter Template catalog and business Template revisions.
- Test send, schedule/cancel, timezone and quiet-hour policy, Calendar.
- Newsletter and Coupon starters.
- Broadcast delivery/reply/outcome drill-down.

**Exit:** a small business can handle personal replies and safely schedule and measure mass email/text communication without creating a second Inbox hierarchy.

### Phase 3 — Automation and multi-platform expansion

- Inline Follow up automatically tied to immutable content revisions.
- Per-Contact skip/pause and Calendar visibility.
- Additional social/DM adapters based on provider feasibility and permission review.
- Saved views, team collision controls, approvals, bulk operations.
- Expand indexed Activity search, rollup throughput, and projection observability.

**Exit:** follow-up is trustworthy across sources and channel expansion does not weaken the operating model.

### Phase 4 — Insights and optimization

- Response/resolution operations reporting.
- Cohort comparison for Template, timing, Audience, and channel.
- Inspectable insight cards with minimum sample thresholds.
- Experiment support only after attribution and delivery inputs are reliable.

**Exit:** insights are decision-grade, traceable, and lead directly back to work.

## 16. Success measures

Product success:

- Percentage of daily operational work completed from Activity without navigating to another top-level surface
- Time from an actionable system event to acknowledgement and resolution
- Action-required backlog by age and source
- Search/filter success and saved-view reuse
- Rollup expansion rate and event-noise complaints
- Median time from inbound receipt to first human response
- Percentage of inbound Conversations resolved within the business's target
- Oldest unresolved Conversation and backlog over 24 hours
- Time to first outbound action for a new Lead
- Broadcast setup completion and schedule/send success
- Template adoption and time saved to first draft
- Automation failure, skip, opt-out, and human-handoff rates
- Reply, Lead, Sale, and Revenue outcomes by channel and Broadcast

Reliability guardrails:

- Inbound webhook deduplication rate
- End-to-end canonical-event-to-Activity latency
- Queue and projection lag
- Rollup accuracy and canonical-event reconciliation
- Story-normalization duplicate and false-merge rate
- Late-event detection and notification latency
- Unauthorized Activity disclosure or action execution (target: zero)
- Duplicate-send incidents
- Delivery event reconciliation rate
- Suppression/consent violations (target: zero)
- Scheduled-send deadline adherence

## 17. Decisions this proposal makes

- Activity becomes the one top-level command-center mental model; Messages evolves into it rather than remaining a classic inbox.
- There is one default stream. Source, Type, Person, Ad, Page, Status, Needs action, and Date provide segmentation.
- Human Messages, Broadcasts, and system events are Activity items with source/type properties, not competing primary modes.
- System activity is expected to dominate volume and is first-class in hierarchy, interaction design, and metrics.
- High-volume clicks, visits, views, syncs, and repeated automation events roll up by default but remain individually queryable and auditable within retention policy.
- Activity items retain their canonical domain records; the unified stream is a versioned presentation/search projection.
- Related canonical writes normalize into one business story, while later reversals and failures remain distinct.
- Immutable Activity history and mutable AttentionItems are separate.
- Occurred time controls chronology; observed time makes late arrivals visible without reordering the user's active viewport.
- Contacts, Audiences, Templates, Automations, Scheduled work, Broadcasts, and Performance are managed from Activity's secondary tools.
- Newsletters and coupons are Broadcast use cases powered by starter Templates.
- Personal and mass communication share channel infrastructure, content primitives, scheduling, consent, and metrics, but use distinct Conversation and Broadcast work models.
- Metrics live next to the Activity they explain and always support drill-down.
- The current Message model is not sufficient for Broadcast delivery or provider-level personal messaging and should evolve through an explicit compatibility migration; it must not become the generic Activity table.

## 18. Open product decisions

These choices should be settled before the Activity contract and provider work:

1. Which event types promote, show individually, or roll up in the default stream?
2. What time windows and thresholds apply to click, visit, view, sync, and automation rollups?
3. Which domain states automatically create, reopen, or resolve an AttentionItem?
4. Is V1 assignment individual-only, or does it require teams/queues?
5. Which email and SMS providers are the first supported reference adapters?
6. Which social inbox has the highest customer value after email and SMS, given provider API restrictions?
7. What are the default quiet hours and legal/compliance regions at launch?
8. Which users may approve, schedule, cancel, or send high-volume Broadcasts?
9. What attribution window connects Activity, a reply, or a Broadcast recipient to a later Lead or Sale?
10. What minimum sample threshold is required before LOOPIE presents a comparative insight?

Until these are decided, the safe defaults are: promote state creation, failures, reversals, replies, and unresolved work; roll up repetitive informational events; individual assignment; only actionable events reopen work; high-volume sends require an ADMIN approval capability; and insights remain descriptive rather than prescriptive.
