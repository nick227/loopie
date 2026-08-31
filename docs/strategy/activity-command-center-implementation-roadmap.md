# Activity Command Center — Implementation Roadmap

**Companion proposal:** [Activity Command Center](../architecture/activity-command-center-proposal.md)  
**Approach:** Additive, contract-first, projection-based, and shipped in usable vertical slices

## 1. Freeze the Activity contract

Before building UI, define the first supported taxonomy and response contract.

- Start with the bounded Phase 1 types from the proposal: Lead/form stories, Sales/payments/reversals, Message replies, ad/run failures and lifecycle, automation failures, sync failures, identity matches, Page publishes, Broadcast lifecycle, plus rollups for clicks, visits, views, successful automations, and successful syncs.
- Define `ActivityItem`, `AttentionItem`, Source, Type, Status, references, actions, `occurredAt`, `observedAt`, `storyId`, aggregation, and seen state in `packages/api-spec/openapi.yaml`.
- Add `GET /activity`, `GET /activity/{activityId}`, AttentionItem mutation endpoints, and a lightweight new-items/checkpoint endpoint.
- Make Source and Type LOOPIE-owned enums or versioned values. Keep raw provider terminology as evidence, not public filter vocabulary.
- Run the existing SDK generation and drift checks; application code consumes generated types rather than parallel handwritten contracts.

**Done when:** fixtures can express every initial Activity row, rollup, inspector, filter, and Needs action state without `any` or provider-specific client branching.

## 2. Add the projection foundation

Keep Lead, Sale, Message, AdRun, ExternalEvent, and other domain records canonical. Activity is a read projection.

- Add additive Prisma models for `DomainEventOutbox`, `ActivityItem`, `AttentionItem`, `ActivitySeenState`, and the query-critical reference/facet fields.
- Store business id, taxonomy version, Source, Type, attention class, occurred/observed times, story id, primary references, aggregate count/window, and normalized search text in indexed columns. Use JSON only for display evidence that is not filter-critical.
- Write an outbox row in the same database transaction as each new canonical state change. Do not make uncoordinated dual writes to canonical and Activity tables.
- Add an idempotent projector, following the repository's existing poller/service conventions. Claim outbox work safely, project by deterministic key, record attempts, and tolerate retries.
- Add a cursor-based backfill command for existing records. It must be resumable, tenant-safe, and use the same normalizers as live projection.

**Done when:** replaying or backfilling the same inputs produces identical Activity rows without duplicates.

## 3. Implement normalization, stories, and rollups

Build small normalizers by domain rather than one giant conditional service.

```text
canonical event
→ domain normalizer
→ taxonomy entry
→ story correlation
→ promotion / rollup rule
→ Activity projection
→ optional AttentionItem
```

- Give each taxonomy entry one normalizer, inspector type, permissions rule, default attention behavior, and aggregation policy.
- Correlate related writes using canonical ids and provider ids: FormSubmission + Lead creation becomes one story; order + payment + Sale may become one story when evidence is sufficient.
- Use fixed aggregation windows and deterministic keys. Promoted children are excluded from rollup counts and appear separately.
- Keep Activity immutable as history. Create or update an `AttentionItem` for actionable work; repeated failures may update one issue while retaining each underlying event.
- Record both occurred and observed time. New-item discovery uses observed time; stream chronology uses occurred time.

**Done when:** realistic seed data produces a calm stream with no duplicate business stories and no click/view floods.

## 4. Build the API and authorization layer

Follow the existing handler → service → Prisma structure.

- `ActivityService` owns tenant-scoped querying, cursor pagination, structured filters, search, saved-view parameters, and inspector retrieval.
- Query-critical filters are explicit: Source, Type, Person, Ad, Page, Status, Needs action, and Date.
- Stable pagination uses `(occurredAt DESC, id DESC)`. A separate observed-time checkpoint reports late and newly arrived items.
- Resolve available actions server-side from canonical state and user capabilities. Re-check authorization and current state when executing every action.
- Apply permission and redaction rules before projection/query results leave the server. Never index credentials, raw webhook payloads, or unnecessary personal data.
- Add operational metrics for outbox age, projector lag, failures, deduplication, rollup counts, and late events.

**Done when:** integration tests prove tenant isolation, pagination stability, filter combinations, late-event discovery, redaction, idempotency, and action authorization.

## 5. Ship the Activity workspace

Build the intended interaction directly; do not evolve the existing Message card list into it piecemeal.

- Add `/activity` and update the Shell label to **Activity**. Keep `/messages` as a compatibility redirect until old links and tests are migrated.
- Use React Query infinite queries with every filter encoded in URL search parameters. Saved views store that same query shape.
- Build the workspace from focused components: `ActivityNav`, `ActivityFilterBar`, `ActivityStream`, `ActivityRow`, `NewActivityNotice`, and a polymorphic `ActivityInspector`.
- Use the existing semantic UI primitives and tokens. Rows share Source → Type → event → subject → status → time grammar; inspectors vary by domain.
- Do not prepend live items while the user is reading. Show **N new items** and insert on request.
- Implement **All activity** and **Needs action** first. Add saved views only after the filter contract is stable.
- Link Home items to the exact Activity item or filtered view while keeping Home's brief role intact.

**Done when:** desktop, tablet, mobile, keyboard, loading, empty, error, degraded-projection, and reduced-motion states work against real API data.

## 6. Roll out by source, then add communication creation

- Enable Activity for internal/test accounts first and compare its stories and counts against canonical records and Home's existing feed.
- Backfill in bounded batches, monitor projection lag and false merges, then make Activity the primary navigation destination.
- Migrate one source family at a time: Leads/forms, Sales/commerce, Ads/runs, Automations/integrations, then Messages/Broadcasts.
- Keep canonical domain detail pages authoritative. Activity supplies context and safe direct actions, not duplicate configuration screens.
- After the stream is trustworthy, implement personal email/SMS, Broadcast composition, Templates, scheduling, and delivery events as new canonical domains feeding the same projection.
- Remove the compatibility `/messages` route only after deep links, Home links, tests, and user navigation have moved.

**Done when:** Activity is the reliable operating record, system traffic is summarized correctly, actionable work is accountable, and new communication features plug into the same model without changing its information architecture.

## Engineering rules throughout

- Prefer additive migrations and compatibility reads; do not rewrite existing canonical history.
- Keep money, provider status, attribution, and Message delivery truthful to their owning systems.
- Use transactions and idempotency at every ingest/project/action boundary.
- Put queryable fields in columns with intentional indexes; do not build the core filter system over arbitrary JSON.
- Generate SDK types from OpenAPI and run drift checks after every contract change.
- Test taxonomy rules as pure functions, projection with integration tests, and the workspace with focused component and end-to-end tests.
- Do not add a new Activity type until it has normalization, permissions, promotion/rollup behavior, inspector behavior, and test coverage.
