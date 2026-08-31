# RFC: Embeddable Published Objects v1

**Status:** Accepted for implementation  
**Scope:** Closed-loop Page and Advertisement embeds  
**Contract tests:** `apps/server/src/__tests__/embeddablePublishedObjects.contract.test.ts`
**Implementation roadmap:** [Embeddable Published Objects v1](../strategy/embeddable-published-objects-v1-implementation-roadmap.md)

## Goal

Make published Pages and Advertisements portable without taking them out of LOOPIE's acquisition
and reporting loop. V1 proves both complete paths:

```text
Page: publish -> deploy -> embed -> view -> form -> Lead/CRM/Inbox -> success
Ad:   publish -> deploy -> embed -> impression -> click -> Page/form attribution
```

Both paths use the same identity graph:

```text
Object ──< Snapshot
   └─────< Deployment ──> one active Snapshot
                          └──< Instance bound permanently to that Deployment + Snapshot
```

The public surface remains one stable snippet per deployment:

```html
<script async src="https://embed.loopie.com/v1.js" data-loopie-id="pg_abc123"></script>
```

`pg_` identifies a Page deployment and `ad_` identifies an Advertisement deployment. The snippet
does not change when that deployment is promoted to another version or rolled back.

## V1 scope

### Page embeds

- Render one immutable published Page snapshot in deterministic embed-safe mode.
- Run snapshot-defined forms entirely inside the iframe.
- Create or resolve the Contact and Lead, retain complete attribution, and project the submission
  into CRM and Inbox.
- Execute snapshot-defined success behavior: inline confirmation or an explicit iframe/top-level
  redirect.

### Advertisement embeds

- Render one immutable published Advertisement snapshot in an isolated, dimensioned creative slot.
- Distinguish creative load from a visibility-qualified impression.
- Record a tracked click and carry its signed attribution session through top-level navigation.
- Navigate the top-level page only from a real user-activated click.

### Deployments and analytics

- Allow one Page or Advertisement to have many stable deployments.
- Give every deployment its own public ID, active version, status, and domain policy.
- Support multiple embeds on one document and idempotent initialization per declared target.
- Attribute every runtime event to its exact object, deployment, version, checksum, and instance.

## Non-goals

V1 does not include pinned-version markup, theme overrides, arbitrary host callbacks or JavaScript,
inline DOM rendering, or consent-platform integrations. Deployment purpose/environment fields may
be added later without changing identity, but multiple deployments themselves are required in V1.

## Identities and ownership

| Identity         | Cardinality and responsibility                                               | Lifetime                        |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| Object           | Mutable Page or Advertisement working state                                  | Until object deletion           |
| Snapshot         | Many per object; immutable renderable content                                | Permanent                       |
| Embed deployment | Many per object; stable operational identity and one active snapshot pointer | Stable until explicitly deleted |
| Embed instance   | Many per deployment; one authorized runtime bound once to one snapshot       | One initialization              |

The database model is `EmbedDeployment`, not `Deployment`, because the latter already means an
external advertising deployment in this repository. An embed deployment has exactly one of
`landingPageId` or `advertisementId`; its typed, opaque `publicId` is the snippet ID.

For example, one Page may have independent website, partner, and staging deployments. Promoting
the website deployment does not move either of the other pointers.

## Locked invariants

1. Editor and working-state content is never publicly renderable.
2. Publishing creates an immutable snapshot; snapshot rows are never updated in place.
3. A renderer reads only the snapshot resolved for its instance.
4. Each object may own many deployments, and each deployment points to exactly one snapshot of
   that same object while active.
5. Promotion and rollback atomically move only the selected deployment's `activeVersionId`.
6. An instance binds once to a deployment, version, and checksum for its entire lifetime.
7. Every event carries object, deployment, version, checksum, and instance identity.
8. The runtime returns and records the checksum of the exact snapshot it rendered.
9. Hosted and embedded Page presentations consume the same snapshot through separate,
   deterministic renderer modes.
10. Form validation and success behavior come from the instance's Page snapshot.
11. Domain authorization uses browser-controlled origin evidence and fails closed for an
    allowlist when the origin is absent, opaque, or unauthorized.
12. The loader is idempotent per declared target; distinct targets receive distinct instances.
13. The deployment snippet is stable across promotion and rollback.
14. Rollback, pause, unpublish, or object deletion never removes snapshots or historical analytics.
15. Attribution does not depend on third-party cookies.

## Snapshots

`PublishedPageVersion` already freezes Page content, theme, form, ad slots, and template schema.
V1 extends it with a deterministic checksum and explicit form success behavior. Legacy snapshots
may be migrated to inline success using their frozen `formSnapshot.successMessage`; embed
resolution never falls back to live form or template state.

V1 introduces `PublishedAdvertisementVersion`. `MediaOrderRevision` is not an Advertisement
creative snapshot: it records authorization for an external platform order and must remain a
separate concept. The Advertisement snapshot freezes everything needed to render and navigate:
creative assets or immutable asset revisions, copy, dimensions/aspect ratio, accessible label,
destination, tracked-click configuration, renderer format version, and checksum.

Checksums use SHA-256 over versioned canonical JSON containing every field consumed by the
renderer or form/click behavior. Canonicalization recursively sorts object keys and preserves
array order. It excludes database timestamps, row IDs, credentials, and mutable control-plane
settings.

Page success behavior is a tagged snapshot value:

```ts
type FormSuccessBehavior =
  | { type: 'INLINE'; message: string }
  | { type: 'REDIRECT'; url: string; target: 'IFRAME' | 'TOP_LEVEL' }
```

Redirect URLs are validated when publishing. `INLINE` replaces the form with confirmation inside
the iframe. `IFRAME` navigates only the embedded frame after `form_succeeded`. `TOP_LEVEL` asks the
validated loader instance to navigate its own top-level window after `form_succeeded`; it is never
inferred from the URL or host context.

## Persisted state

Minimum required additions, expressed as a logical model:

```text
PublishedPageVersion
  checksum
  successBehavior

PublishedAdvertisementVersion
  id, advertisementId, version
  creativeSnapshot, destination, dimensions
  checksum, publishedAt, publishedBy

EmbedDeployment
  id
  publicId              unique pg_... or ad_...
  objectType            PAGE | ADVERTISEMENT
  landingPageId?        exactly one object FK is populated
  advertisementId?
  activeVersionId       typed relation to a snapshot of that object
  status                ACTIVE | PAUSED | UNPUBLISHED
  domainPolicy          ANY | ALLOWLIST
  allowedOrigins        normalized origins
  createdAt, updatedAt

EmbedInstance
  id, objectType, objectId, deploymentId
  versionId, snapshotChecksum, authorizedOrigin
  attributionSessionId?
  createdAt
```

Because Prisma cannot express one foreign key to two snapshot tables, implementation may use
typed nullable Page/Advertisement version foreign keys instead of the logical `activeVersionId`,
with an application and database constraint that exactly one valid pointer matches `objectType`.

An instance may initially be represented by a signed server token plus event records instead of a
durable row. Its identity and immutable binding requirements remain the same.

## Publish, promote, and rollback

Publishing and deployment promotion are distinct operations:

1. **Publish** validates working state and creates the next immutable snapshot and checksum.
2. **Promote** validates snapshot ownership and atomically moves one selected deployment's active
   pointer.
3. **Rollback** is promotion to an older snapshot; it creates or edits no snapshot.

The product may offer a transactional **Publish and deploy** command for one or more explicitly
selected deployments. Publishing must never silently advance every deployment belonging to an
object. Cache invalidation and activity emission happen only after commit.

An existing instance remains on its stored version after any promotion or rollback. New instances
resolve the selected deployment's current pointer.

## Resolution and trusted origin

The embed service authorizes the parent origin before releasing snapshot content. `hostUrl`, URL
parameters, referrer, and `postMessage` payload fields are context, not authorization evidence.

```text
host loads v1.js
  -> loader POSTs /v1/embeds/:publicId/authorize
     (browser supplies the non-script-settable Origin request header)
  -> service validates deployment status, exact normalized origin, and active snapshot
  -> service returns a short-lived, single-use bootstrap token
  -> loader creates /e/:publicId iframe and transfers token + attribution context
  -> iframe atomically redeems token for snapshot + identity binding
  -> iframe renders and emits the object-specific loaded event
  -> loader reports qualified visibility to that instance
```

Under `ALLOWLIST`, missing and `null` origins are rejected. The bootstrap token binds public ID,
object, deployment, authorized origin, version, checksum, expiry, and nonce. Redemption cannot
re-resolve the active pointer. Every runtime message validates protocol version, browser
`event.origin`, `event.source`, object ID, deployment ID, and instance ID. Page iframes use
`allow-scripts allow-same-origin`; without `allow-same-origin`, browsers expose an opaque `null`
message origin and the loader cannot authenticate the runtime. This remains isolated because the
iframe is cross-origin from its host and cannot remove its own sandbox element.

Host URL, referrer, UTMs, and an incoming signed LOOPIE attribution session are transferred via
`postMessage`, not embedded in the iframe URL. The loader may read a signed attribution token from
the host page URL; it cannot manufacture one.

## Loader and visibility

The loader creates one sandboxed responsive iframe per declared target, applies messages only to
the matching validated instance, and marks that target initialized. Re-executing the script does
not duplicate an initialized target. Another target, even for the same public ID, creates another
instance.

Visibility is measured by the loader's `IntersectionObserver`, because the iframe cannot reliably
measure its position in the parent viewport. Visibility messages contain the observed ratio and
duration and are accepted only from the authorized loader/instance channel.

V1 locks these once-per-instance semantics:

- `embed_loaded`: a Page iframe redeemed its token, rendered its snapshot, completed the handshake,
  and accepted initial attribution context. It does not imply visibility.
- `page_viewed`: the Page has at least 50% of its width and `min(250px, iframe height)` vertically
  visible for one continuous second.
- `ad_loaded`: an Advertisement iframe redeemed its token and rendered the creative. It does not
  count as an impression.
- `ad_impression`: at least 50% of the creative's rendered area is visible for one continuous
  second. Dropping below the threshold resets the timer.

Resizes cannot manufacture a second view or impression. The event pipeline deduplicates each
once-per-instance event using a stable idempotency key.

## Page forms, success, and closed-loop attribution

Forms render, validate, and submit entirely inside LOOPIE's iframe and against the bound snapshot.
The submit request carries the instance binding and signed attribution session. The server rejects
identity or schema mismatches.

One accepted submission transactionally creates `FormSubmission`, resolves or creates `Contact`,
and resolves or creates `Lead` using the existing first-touch attribution rules. It stores the Page
object, embed deployment, Page version, instance, and upstream Advertisement click identities.
It also writes a durable domain/outbox event so CRM/Activity and both Contact/Page Inbox projections
are eventually completed and retryable without failing or duplicating the submission.

Event order is:

```text
form_submitted (request dispatched)
  -> accepted transaction
  -> form_succeeded
  -> inline confirmation or declared redirect
```

Client validation failure emits `form_failed` without `form_submitted`; network or server failure
after dispatch emits both. A failed submission creates no Lead and never executes success behavior.
Retries use a submission idempotency key so one logical submission cannot create duplicate Leads
or Inbox messages, while each distinct attempt remains observable.

## Advertisement clicks and downstream attribution

The Advertisement snapshot contains its destination and click behavior. A click uses a LOOPIE
tracking URL as the anchor `href` with `target="_top"`. The iframe sandbox permits top navigation
only from user activation, and the creative click handler cancels any event whose `isTrusted` is
false. Chromium permits a synthetic `element.click()` through the sandbox flag alone, so both
checks are required. The tracking endpoint records `ad_clicked` idempotently, mints or continues
a signed attribution session, and redirects to the snapshot destination.

The redirect carries the signed session to the destination Page or host page without relying on
third-party cookies. If the destination contains a Page embed, its loader transfers that session
to the Page instance. A later form submission retains both the Advertisement deployment/version/
instance/click identity and the Page deployment/version/instance identity through Lead, CRM,
Activity, and Inbox projections.

Programmatic clicks, messages, loads, and impressions from the runtime never trigger navigation.
The public tracking endpoint cannot cryptographically distinguish a browser user activation from
a direct HTTP request, so bot and replay controls are separate from the navigation guarantee.
Browser tests must prove `target="_top"`, trusted-event enforcement, and the chosen sandbox flags
in every supported browser before Advertisement embeds ship.

## Event contract

Page events:

```text
embed_loaded
page_viewed
form_started
form_submitted
form_succeeded
form_failed
```

Advertisement events:

```text
ad_loaded
ad_impression
ad_clicked
```

The event meanings are fixed:

| Event            | Meaning                                                                   | Cardinality                                      |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `embed_loaded`   | Page snapshot rendered, handshake completed, and initial context accepted | Once per Page instance                           |
| `page_viewed`    | Page visibility threshold held continuously for one second                | At most once per Page instance                   |
| `form_started`   | First field value change or first submit attempt                          | At most once per Page instance                   |
| `form_submitted` | A client-valid submission request was dispatched                          | Once per distinct submission attempt             |
| `form_succeeded` | The idempotent submission transaction committed                           | Once per logical submission                      |
| `form_failed`    | Client validation, network, or server processing failed                   | Once per failed attempt and safe reason category |
| `ad_loaded`      | Advertisement creative rendered; visibility is not implied                | Once per Advertisement instance                  |
| `ad_impression`  | Advertisement visibility threshold held continuously for one second       | At most once per Advertisement instance          |
| `ad_clicked`     | Tracking endpoint accepted a real user-activated creative click           | Once per click idempotency key                   |

Every event includes:

```text
eventId, idempotencyKey, eventType, occurredAt, protocolVersion
objectType, objectId, deploymentId, versionId, embedInstanceId, snapshotChecksum
authorizedOrigin
hostUrl, referrer, utmSource, utmMedium, utmCampaign (context only; nullable)
attributionSessionId, upstreamClickId (when present)
```

Event ingestion validates the issued instance binding and rejects conflicting object, deployment,
version, checksum, instance, or origin values. Historical events remain queryable and joined to
their exact snapshots after promotion, rollback, pause, unpublish, or object deletion.

## V1 vertical acceptance paths

### Page path

```text
publish immutable Page snapshot
  -> create/select deployment and promote snapshot
  -> authorize and initialize embed
  -> record embed_loaded
  -> cross visibility threshold and record page_viewed
  -> record form_started and form_submitted
  -> create/resolve Contact and Lead with exact attribution
  -> durably project CRM/Activity and Contact/Page Inbox events
  -> record form_succeeded
  -> execute the snapshot's inline or redirect success behavior
  -> prove every record references the rendered Page version and checksum
```

### Advertisement path

```text
publish immutable Advertisement snapshot
  -> create/select deployment and promote snapshot
  -> authorize and initialize embed
  -> record ad_loaded without an impression
  -> cross visibility threshold and record one ad_impression
  -> activate tracked link from a real user click
  -> record ad_clicked and navigate the top-level page
  -> initialize the downstream Page with the signed attribution session
  -> submit its form and retain both Ad and Page identity chains on the resulting Lead
```

V1 is complete only when both paths pass active integration tests and real-browser tests where
visibility, sandboxing, user activation, CORS, or navigation behavior matters. A test remaining
`todo` means its corresponding contract is not implemented.

## Operational failure states

Never-published, paused, unpublished, unauthorized-origin, expired/replayed-token,
protocol-mismatch, invalid-destination, and resolution-failure states show a neutral failure
surface and structured telemetry without releasing draft content. Deployment control-plane
changes stop new resolutions but do not break an already authorized instance or its historical
identity. An object may be soft-deleted, but snapshots, deployments needed for history, events,
submissions, Leads, and Inbox records remain queryable.
