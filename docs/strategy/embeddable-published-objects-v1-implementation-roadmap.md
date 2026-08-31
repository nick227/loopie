# Embeddable Published Objects v1 — Implementation Roadmap

**Companion RFC:** [Embeddable Published Objects v1](../architecture/embeddable-published-objects-v1.md)  
**Acceptance manifest:** `apps/server/src/__tests__/embeddablePublishedObjects.contract.test.ts`  
**Acceptance map:** [Embeddable Published Objects v1 acceptance map](embeddable-published-objects-v1-acceptance-map.md)  
**Approach:** Additive migrations, contract-first delivery, and two complete vertical paths

## 1. Delivery rule

V1 is not a loader-only release. It ships when both closed loops work:

```text
Page: publish -> deploy -> visible embed -> form -> Lead/CRM/Inbox -> success behavior
Ad:   publish -> deploy -> visible impression -> click -> navigation -> attributed Page form
```

Every phase activates the corresponding TODO contracts. A TODO may be removed from the acceptance
manifest only when an equivalent active unit, integration, or browser test exists in the owning
package. Green infrastructure with the core paths still marked TODO is not a V1 release.

## 2. Component ownership

| Area                                 | Owner                         | Responsibility                                                                      |
| ------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------- |
| Database and shared identity helpers | `packages/db`                 | Snapshots, deployments, instances, events, attribution relations, migrations        |
| Browser/server protocol              | new `packages/embed-contract` | Message schemas, event names, identity envelopes, canonical snapshot hashing inputs |
| Authenticated control plane          | `apps/server`                 | Publish, deployment CRUD, promotion/rollback, form submission, CRM/Inbox projection |
| Public embed data plane              | `apps/ad-server`              | `v1.js`, origin authorization, iframe shell, token redemption, events, Ad clicks    |
| Product UI                           | `apps/web`                    | Embed modal, deployment selection/creation, domain policy, copy code, status        |
| Cross-origin browser tests           | `apps/web/e2e`                | CORS, iframe protocol, visibility, sandbox navigation, form success behavior        |

`apps/ad-server` already owns public, unauthenticated, latency-sensitive embeds and tracked AdUnit
clicks. V1 extends that service rather than putting high-volume embed traffic into `apps/server`.
The service name can remain unchanged for V1. Existing `/embed/:adUnitId`, impression pixel, and
AdUnit click behavior remain compatibility paths; they are not silently reinterpreted as the new
Advertisement deployment contract.

## 3. Critical path

```text
Phase 0: browser/security spikes
           |
Phase 1: schema + shared contract
           |
Phase 2: publish/deployment control plane
           |
Phase 3: authorization + loader + iframe runtime
          / \
Phase 4: Page render/visibility   Phase 6: Ad render/impression/click
           |
Phase 5: forms + CRM/Inbox -------+
           |
Phase 7: Ad -> Page attribution proof
           |
Phase 8: product UI, operations, and rollout
```

Phase 6 may begin after Phase 3 while Page forms are being completed. Phase 7 is the integration
gate and cannot begin until both vertical implementations exist.

## Phase 0 — Prove browser and security behavior

Build the risky browser behaviors as disposable fixtures before committing the runtime API.

- Extend the existing Playwright harness to start `apps/ad-server` and two host fixtures on
  distinct origins. Test both allowed and denied parent origins.
- Declare the supported browser matrix. At minimum, run the navigation and sandbox suite in
  Chromium and WebKit; add Firefox if it is part of the V1 support promise.
- Prove a cross-origin loader request exposes the browser-controlled `Origin` header and that
  allowlist denial releases no snapshot payload.
- Prove a short-lived token can be transferred to a sandboxed iframe and redeemed once.
- Prove `IntersectionObserver` behavior across scrolling, iframe resizing, background tabs, and
  threshold interruption. Use real timers for the one-second qualification tests.
- Prove a tracked anchor with `target="_top"`, `allow-top-navigation-by-user-activation`, and an
  `event.isTrusted` guard navigates only after a real user click in each supported browser. The
  sandbox flag alone does not block Chromium's synthetic `element.click()` navigation.
- Prove an asynchronous successful form can request top-level navigation through its validated
  loader channel without granting the Page iframe unrestricted top navigation. Use
  `allow-scripts allow-same-origin` for the cross-origin Page iframe so its messages retain a
  verifiable origin.

**Exit gate:** browser tests select the exact sandbox flags, token-transfer mechanism, visibility
clock behavior, and top-level navigation implementation. Any RFC assumption disproved here is
revised before schema or API work depends on it.

## Phase 1 — Add the identity and event foundation

Use additive Prisma migrations. Do not replace or rename the existing advertising `Deployment`,
`AdUnit`, `PublishedPageVersion`, or `MediaOrderRevision` models.

### Snapshots

- Add `checksum`, renderer format version, and tagged `successBehavior` to
  `PublishedPageVersion`.
- Backfill existing Page versions with deterministic checksums. Convert frozen
  `formSnapshot.successMessage` into `INLINE` success behavior without reading the live Form.
- Add `PublishedAdvertisementVersion` with a per-Advertisement version number, immutable creative
  payload, immutable asset references, destination, dimensions/aspect ratio, accessible label,
  renderer format version, checksum, and publication audit fields.
- Add one canonical JSON and SHA-256 implementation in `packages/embed-contract`; publish and
  resolution tests use the same golden vectors without duplicating hashing code.

### Deployments and authorization

- Add `EmbedDeployment` with typed object ownership, unique typed `publicId`, status, and typed
  nullable active Page/Advertisement version pointers.
- Add `EmbedAllowedOrigin` rows with normalized origins and a uniqueness constraint per deployment
  rather than hiding authorization data in JSON.
- Add database/application checks that exactly one object FK is populated and that an active
  version belongs to that object and matches its type.
- Add a consumed bootstrap nonce record or equivalent atomic replay guard.
- Persist `EmbedInstance` at token redemption so event, submission, and attribution relations have
  a durable identity rather than depending only on an opaque token.

### Events and attribution

- Add `EmbedEvent` with indexed identity columns, event type, safe context, occurrence time, and a
  unique idempotency key. Keep filter-critical fields out of arbitrary JSON.
- Enforce once-per-instance uniqueness for load/view/impression events.
- Extend `AttributionEvent`, `FormSubmission`, and Lead attribution with the necessary Ad embed and
  Page embed deployment/version/instance references. Preserve the existing external Deployment,
  AdRun, and AdUnit attribution fields.
- Add a durable outbox record for submission-driven CRM, Activity, and Inbox projections.

### Migration safety

- Keep current hosted Page resolution on `LandingPage.publishedVersionId` during V1 migration.
- Make the new embed resolver strict: it cannot use the hosted pointer or legacy live-form fallback.
- Do not auto-create or auto-promote deployments for every historical object during migration.
  Provide an explicit, resumable command for accounts selected for rollout.

**Exit gate:** schema tests prove snapshot immutability, checksum backfill, typed ownership,
cross-object promotion rejection, idempotency constraints, and preservation of historical rows.

## Phase 2 — Implement publication and deployment control APIs

Keep authenticated configuration in `apps/server` and describe it in OpenAPI so `apps/web` uses
generated SDK types.

- Extend Page publication to write checksum and success behavior while preserving the hosted Page
  behavior already in production.
- Add Advertisement publication. Do not reuse `MediaOrderRevision`; it remains the external media
  authorization record.
- Add tenant-scoped endpoints to list, create, update, pause, unpublish, and inspect embed
  deployments for Pages and Advertisements.
- Add explicit promotion and rollback commands. Both validate snapshot ownership and lock the
  selected deployment row before moving its pointer.
- Keep plain publish separate from promote. Provide a transactional publish-and-deploy service
  operation only when the caller explicitly supplies the target deployment IDs.
- Return the stable snippet from deployment identity, never from the active version.
- Emit management activity after transaction commit and invalidate only the changed deployment's
  resolution cache.
- Generate the SDK and run drift checks after every OpenAPI change.

**Exit gate:** server integration tests create three deployments for one object, independently
promote and roll them back, and prove publishing a new snapshot moves none of them implicitly.

## Phase 3 — Build the public loader and runtime spine

Implement the versioned public data-plane contract in `apps/ad-server`.

### Public routes

```text
GET  /v1.js
POST /v1/embeds/:publicId/authorize
GET  /e/:publicId
POST /v1/embed-instances/redeem
POST /v1/embed-events
```

- Serve `v1.js` as a small dependency-free, cacheable asset. Keep authorization, iframe HTML, and
  token responses `no-store`.
- Make authorization CORS behavior deliberate. Do not reuse the service's current broad
  `origin: true` policy as proof of authorization.
- Normalize and validate the browser `Origin` header, deployment status, policy, and current
  snapshot before issuing a short-lived single-use token.
- Bind the token to public/object/deployment/version/checksum/origin identity. Atomically redeem it
  into one `EmbedInstance`; never re-resolve the active pointer during redemption.
- Build the loader as an idempotent target scanner. Multiple script tags and multiple deployments
  on one document must not share instance state.
- Define discriminated, runtime-validated protocol messages in `packages/embed-contract` for
  ready/init/resize/visibility/success-navigation/error flows.
- Validate `event.origin`, `event.source`, protocol version, object, deployment, and instance on
  every message. Treat host URL, referrer, UTMs, and payload origin strings as context only.
- Add CSP, iframe title, sandbox flags, referrer policy, timeout, and neutral failure states.
- Add public rate limits by deployment, origin, and IP without making shared NAT traffic unusable.

**Exit gate:** two allowed embeds initialize independently, duplicate loader execution creates no
extra instances, a denied origin receives no snapshot, replay fails, and every protocol mismatch
produces a controlled error.

## Phase 4 — Complete Page rendering and visibility

- Add a strict embed renderer mode to the existing Page renderer. It accepts a resolved
  `PublishedPageVersion` DTO, never a `LandingPage` row.
- Suppress hosted chrome deterministically, remove full-viewport assumptions, constrain sticky
  behavior, preserve accessible form markup, and report content-height changes.
- Ensure Page media URLs and template schema are frozen or content-addressed at publication time.
- Emit `embed_loaded` only after render, handshake, and initial attribution context acceptance.
- Measure visibility in the parent loader. Emit `page_viewed` after 50% width and
  `min(250px, iframe height)` vertical visibility hold for one continuous second.
- Reset the timer when the threshold breaks and deduplicate the view across resizes, retries, and
  repeated visibility messages.
- Keep an initialized instance on its exact snapshot when its deployment is promoted or rolled
  back. Prove a new instance resolves the new pointer.

**Exit gate:** the Page renders responsively on both host fixtures, load and view remain distinct,
multiple instances resize correctly, and no working-state edit appears until a new snapshot is
published and explicitly promoted.

## Phase 5 — Complete forms, success behavior, CRM, and Inbox

Keep canonical submission logic in `apps/server`; expose an instance-authenticated public embed
submission endpoint restricted to the embed runtime origin.

- Include instance identity, signed attribution session, submission idempotency key, and snapshot
  form values in every request.
- Resolve the form schema exclusively through the instance's bound Page version. Remove live-form
  fallback from this path, including for legacy snapshots admitted to embed rollout.
- Emit `form_started`, `form_submitted`, `form_succeeded`, and `form_failed` with the RFC's exact
  cardinality and ordering.
- In one transaction, create `FormSubmission`, resolve/create Contact and Lead with existing
  first-touch rules, save Page and upstream Ad identity, and enqueue the projection outbox event.
- Make submission retry idempotent without relying on the current `(landingPageId, sessionId)`
  uniqueness alone; one visitor session may legitimately submit more than one embed deployment or
  form.
- Project Activity and Contact/Page Inbox messages from the outbox with deterministic keys and
  retry bookkeeping. Projection failure cannot roll back a successful Lead, but it must remain
  visible and retryable.
- Implement `INLINE`, `IFRAME`, and `TOP_LEVEL` success behavior from the snapshot. Send a
  top-level redirect message only after the successful transaction and validate it against the
  instance binding in the loader.
- Categorize form failures without returning field values or sensitive server errors in analytics.

**Exit gate:** a real embedded Page creates exactly one submission and Lead, updates CRM/Activity,
posts deduplicated Contact/Page Inbox messages, then performs each declared success behavior. All
records join to the rendered checksum and version.

## Phase 6 — Complete Advertisement snapshots, impressions, and clicks

- Add the minimal Advertisement publish UI/API fields required by the snapshot: selected creative,
  dimensions/aspect ratio, accessible label, and destination.
- Render only `PublishedAdvertisementVersion` through a fixed or aspect-ratio-preserving iframe;
  never read mutable Advertisement assets or destination during serving or clicking.
- Emit `ad_loaded` after creative render without incrementing impressions.
- Emit one `ad_impression` only after at least 50% creative-area visibility holds continuously for
  one second. Reset the timer below threshold and deduplicate server-side.
- Render the CTA as a tracked anchor using the browser-tested `target="_top"` and sandbox policy.
- Record `ad_clicked` at the tracking endpoint with the Ad deployment/version/instance/checksum,
  mint or continue the signed attribution session, and redirect to the snapshot destination.
- Reject expired, paused, unpublished, mismatched, or replayed click attempts consistently. The
  rendered creative suppresses untrusted programmatic navigation; the public HTTP endpoint uses
  rate limiting and abuse controls because it cannot prove browser user activation by itself.
- Keep legacy AdUnit counters and pixel semantics unchanged; new Advertisement embed reporting
  reads `EmbedEvent` and the new embed attribution fields.

**Exit gate:** browser tests distinguish load from impression, prove threshold reset and
deduplication, reject non-user navigation, and confirm a real click reaches the exact published
destination through the tracking endpoint.

## Phase 7 — Prove the cross-object acquisition chain

Exercise the actual day-one promise, not a mocked handoff.

- Point an Advertisement snapshot at a host page containing a Page deployment.
- Carry the signed attribution session through the tracked redirect. The loader reads only the
  LOOPIE token, transfers it to the Page instance, and removes it from the visible URL with
  `history.replaceState` after safe capture while preserving unrelated query parameters and hash.
- Submit the embedded Page form and retain both chains:

```text
Advertisement object/deployment/version/instance/click
                              -> attribution session
Page object/deployment/version/instance/submission
                              -> Contact/Lead/CRM/Activity/Inbox
```

- Verify first-touch behavior across repeat clicks and repeat submissions.
- Verify tenant boundaries: a token from another business cannot attribute or submit into the Page.
- Verify rollback on either deployment does not alter historical attribution joins.

**Exit gate:** one Playwright scenario and supporting integration tests query every canonical row
and prove the rendered Ad and Page checksums match the Lead's acquisition evidence.

## Phase 8 — Ship the product surface and operational controls

### Embed UX

- Add **Embed** to Page and Advertisement actions.
- Open a compact modal with deployment selector, status, domain-policy summary, copyable snippet,
  and **Copy code**. Create a default deployment when the user explicitly chooses to embed an
  object; do not create hidden deployments merely by opening the modal.
- Keep the common path simple. Put additional deployment creation and allowlist editing behind a
  small **Placements** or **Manage deployments** affordance in the same flow.
- Explain the operational promise in one line: forms/clicks and tracking stay connected to LOOPIE.
- Show which published version each deployment currently serves and require explicit confirmation
  for promotion, rollback, pause, or unpublish.

### Observability and abuse controls

- Measure authorization denial reasons, token issue/redemption/replay, runtime errors, event ingest
  rejection, Page view and Ad impression qualification, click redirects, submission outcomes,
  outbox age, and projection failures.
- Add alarms for event rejection spikes, projection backlog, click redirect failures, and snapshot
  checksum mismatch. Never log raw form values, signed tokens, or URL fragments.
- Add deployment-level emergency pause and a service-level kill switch that stops new resolutions
  without deleting history.
- Cache immutable snapshot payloads by checksum. Cache deployment pointers briefly and invalidate
  them after promotion; never cache authorization decisions across origins.
- Document Content Security Policy requirements, supported browsers, allowed-origin syntax, and a
  minimal host troubleshooting checklist.

### Rollout

1. Internal accounts on explicit allowlists.
2. Selected Page embeds with inline success.
3. Page redirects and full Inbox projection.
4. Selected Advertisement embeds and tracked navigation.
5. Cross-object attribution customers.
6. General availability after event and canonical-record reconciliation is clean.

Run a shadow reconciliation during rollout: compare Embed events, FormSubmissions, Leads, Inbox
messages, impressions, clicks, and their identity joins. A counter mismatch is investigated; it is
not hidden by rewriting historical events.

**Exit gate:** both vertical paths have zero acceptance TODOs, supported-browser tests pass,
operational dashboards and kill switches exist, and the Embed modal produces stable snippets for
multiple independently controlled deployments.

## 4. Test placement

| Concern                                                                  | Test level                    | Location                                    |
| ------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------- |
| Canonical JSON, checksums, origin normalization, event rules             | Unit                          | `packages/embed-contract`                   |
| Schema constraints, publish/promote/rollback, attribution joins          | Integration                   | `apps/server/src/__tests__`                 |
| Authorization, redemption, event idempotency, tracked clicks             | Integration                   | `apps/ad-server/src/__tests__`              |
| Modal and deployment management                                          | Component                     | `apps/web/src/**/*.test.tsx`                |
| CORS, iframe messages, visibility, resize, success redirects, navigation | Browser                       | `apps/web/e2e`                              |
| Ad -> Page -> Lead/Inbox closed loop                                     | Browser + database assertions | `apps/web/e2e` and server integration tests |

Use fake clocks for pure visibility state-machine tests and real browser time for a small number of
qualification proofs. Do not try to prove sandbox, CORS, `event.origin`, or user activation with
JSDOM/happy-dom.

## 5. Engineering rules throughout

- Preserve the RFC identity envelope at every boundary; never reconstruct version identity from a
  deployment's current pointer after initialization.
- Use additive migrations, explicit backfills, and compatibility reads. Do not rewrite historical
  attribution to fit the new model.
- Keep secrets, credentials, mutable domain policy, and rate-limit state out of snapshots.
- Use transactions for publication, promotion, token redemption, form capture, and click capture;
  use idempotency keys at every retryable public boundary.
- Validate redirect destinations at publication and use the frozen destination at click/success
  time.
- Store normalized origins, not wildcard-like suffix strings. `ALLOWLIST` fails closed.
- Keep high-volume runtime writes out of synchronous CRM/Inbox projection paths; use the durable
  outbox for business projections.
- Treat host URLs as potentially sensitive: drop fragments, store UTMs separately, and avoid
  persisting unrelated query values unless a later contract explicitly requires them.
- Do not call V1 complete while any required browser behavior is covered only by a unit test or
  while any Page/Advertisement acceptance contract remains TODO.
