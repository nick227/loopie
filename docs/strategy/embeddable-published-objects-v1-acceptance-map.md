# Embeddable Published Objects v1 — Acceptance Map

**RFC:** [Embeddable Published Objects v1](../architecture/embeddable-published-objects-v1.md)  
**Roadmap:** [Implementation roadmap](embeddable-published-objects-v1-implementation-roadmap.md)  
**Production manifest:** `apps/server/src/__tests__/embeddablePublishedObjects.contract.test.ts`

## Activation rule

The production manifest is an ordered inventory, not the permanent home for every test. Each TODO
receives the group prefix and ordinal below. It may be removed only after an equivalent active test
exists in the target suite and is referenced in the implementing change. Phase 0 fixture proofs
validate browser mechanisms but do not discharge production runtime contracts.

If a contract needs more than one test level, the TODO remains until all required levels exist.
Moving a test to another package does not weaken the exit gate: V1 completes only when the
production manifest contains zero TODOs.

## Phase 0 mechanism proofs

| ID                 | Active proof                                                                      | Browser status                                              | Production contract affected    |
| ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| `P0-ORIGIN-01`     | Browser-controlled Origin authorizes one host and denies another before rendering | Chromium passed; WebKit environment blocked                 | `AUTH-01`–`AUTH-04`             |
| `P0-TOKEN-01`      | One bootstrap token redeems exactly once across two iframes                       | Chromium passed; WebKit environment blocked                 | `AUTH-05`–`AUTH-07`             |
| `P0-PAGE-VIS-01`   | Page threshold requires one uninterrupted visible second                          | Chromium passed; WebKit environment blocked                 | `PVIS-02`, `PVIS-03`            |
| `P0-BACKGROUND-01` | Backgrounding cancels an in-flight Page qualification                             | Blocked: requires headed browser with a real window manager | `PVIS-02`, `AVIS-02`            |
| `P0-AD-VIS-01`     | Ad reaches one impression after 50% visibility for one second                     | Chromium passed; WebKit environment blocked                 | `AVIS-02`–`AVIS-04`             |
| `P0-RESIZE-01`     | Resize below threshold resets Ad qualification                                    | Chromium passed; WebKit environment blocked                 | `LOAD-03`, `AVIS-03`, `AVIS-04` |
| `P0-AD-NAV-01`     | Untrusted synthetic click is suppressed; trusted click navigates top-level        | Chromium passed; WebKit environment blocked                 | `CLICK-01`, `CLICK-04`          |
| `P0-FORM-NAV-01`   | Validated loader performs asynchronous top-level form-success navigation          | Chromium passed; WebKit environment blocked                 | `SUCCESS-03`                    |

The executable Phase 0 suite is `apps/web/e2e/embed-phase0.spec.ts`. The two blocked browser gates
keep Phase 0 open and prevent finalizing the affected sandbox, visibility, and click contracts.

## Production contract ownership

The ID ranges map in order to the TODO titles inside each manifest `describe` block.

| Manifest group                      | Stable IDs                |  Count | Roadmap phase | Required coverage                                | Target suite                                                              |
| ----------------------------------- | ------------------------- | -----: | ------------: | ------------------------------------------------ | ------------------------------------------------------------------------- |
| Snapshots and render isolation      | `SNAP-01`–`SNAP-06`       |      6 |    1, 2, 4, 6 | Unit + server integration                        | `packages/embed-contract`, `apps/server/src/__tests__`                    |
| Multiple deployments                | `DEP-01`–`DEP-07`         |      7 |          1, 2 | Server integration                               | `apps/server/src/__tests__/embedDeployments.test.ts`                      |
| Resolution and instance consistency | `RES-01`–`RES-05`         |      5 |          3, 4 | Ad-server integration + browser                  | `apps/ad-server/src/__tests__`, `apps/web/e2e`                            |
| Domain authorization                | `AUTH-01`–`AUTH-07`       |      7 |          0, 3 | Ad-server integration + cross-origin browser     | `apps/ad-server/src/__tests__/embedAuthorization.test.ts`, `apps/web/e2e` |
| Loader and protocol                 | `LOAD-01`–`LOAD-05`       |      5 |          0, 3 | Contract unit + browser                          | `packages/embed-contract`, `apps/web/e2e/embed-runtime.spec.ts`           |
| Page visibility analytics           | `PVIS-01`–`PVIS-04`       |      4 |          0, 4 | State-machine unit + browser + event integration | `packages/embed-contract`, `apps/web/e2e`, `apps/ad-server/src/__tests__` |
| Page form closed loop               | `FORM-01`–`FORM-11`       |     11 |             5 | Server integration + browser + projection replay | `apps/server/src/__tests__/embedPageSubmission.test.ts`, `apps/web/e2e`   |
| Page form success behavior          | `SUCCESS-01`–`SUCCESS-05` |      5 |          0, 5 | Server integration + browser                     | `apps/server/src/__tests__`, `apps/web/e2e/embed-form-success.spec.ts`    |
| Advertisement visibility analytics  | `AVIS-01`–`AVIS-04`       |      4 |          0, 6 | State-machine unit + browser + event integration | `packages/embed-contract`, `apps/web/e2e`, `apps/ad-server/src/__tests__` |
| Advertisement click and navigation  | `CLICK-01`–`CLICK-07`     |      7 |       0, 6, 7 | Ad-server integration + browser                  | `apps/ad-server/src/__tests__/embedAdClick.test.ts`, `apps/web/e2e`       |
| Event integrity and history         | `EVENT-01`–`EVENT-06`     |      6 |    1, 3, 5, 7 | Database + service integration                   | `apps/server/src/__tests__`, `apps/ad-server/src/__tests__`               |
| Controlled failures                 | `FAIL-01`–`FAIL-04`       |      4 |          3, 8 | Service integration + browser                    | `apps/ad-server/src/__tests__`, `apps/web/e2e`                            |
| **Total**                           |                           | **71** |               |                                                  |                                                                           |

## Package gates

### `packages/embed-contract`

Owns deterministic, browser-neutral rules: canonical JSON, checksum golden vectors, origin
normalization, protocol message parsing, and later the pure visibility state machines. It must not
import Prisma, application services, credentials, or mutable object models.

### `apps/server`

Owns authenticated publication/deployment configuration and canonical business mutations. Its
integration tests must assert real database transactions, ownership, immutable version joins,
Lead/Contact identity resolution, and durable Activity/Inbox projection.

### `apps/ad-server`

Owns public authorization, token redemption, runtime event ingestion, and tracked Advertisement
clicks. Its tests must distinguish authorization context from trusted Origin evidence and verify
idempotency against the shared database.

### `apps/web/e2e`

Owns behavior that cannot be truthfully established in a DOM emulator: CORS, `event.origin`,
`event.source`, iframe sandboxing, Page Visibility, `IntersectionObserver`, user activation,
top-level navigation, and the complete Ad-to-Page acquisition path.

## Traceability discipline

- Test names begin with the stable contract ID once they move from TODO to active coverage.
- One active test may cover several IDs only when its assertions explicitly prove each contract.
- Browser-mechanism IDs use the `P0-` prefix and never substitute for production IDs.
- A skipped, quarantined, flaky-disabled, or fixture-only test does not discharge a production ID.
- Rollout reconciliation and observability are release gates even though they are not represented
  by one row per operational metric in the 71-code manifest.
