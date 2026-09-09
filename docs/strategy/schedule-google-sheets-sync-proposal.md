# Schedule → Google Sheets Sync — Feature Proposal

**Status:** Shipped (2026-09-10) — backend, worker poller, and frontend all built and tested against the design below; see §8.
**Scope:** One-way sync of `ScheduledGoal` (Calendar task) rows into a dedicated tab of one connected Google Sheet per business, with stable per-row identity so updates modify the same row rather than appending duplicates.
**Product terminology:** "Sync" / "Sheet" in the UI. Not exposed as "export" (a one-time download) — this is a standing, ongoing connection, closer in spirit to the existing Google Sheets _import_ flow than to the one-shot `exportContacts`.

---

## 1. Why this fits as the next phase

The Time Tracking & Team Activity epic (Phases 1-4) gave `ScheduledGoal` real attribution (`createdByUserId`/`assignedToUserId`) and real time data (`TimeEntry`). This feature is the natural next move: take that now-rich task data and put it somewhere a business already lives half its operational life — a spreadsheet — without inventing a second task system or a two-way sync headache. One-way LOOPIE → Sheets is the right call for V1: no conflict resolution, no "did a human or the sync just delete this row," no malformed-date recovery. Sheets is a mirror, never a source of truth.

---

## 2. Research spike — current state

### 2.1 OAuth / token infrastructure — fully reusable

- `Integration.credentialsEnc` holds an encrypted JSON blob (accessToken/refreshToken/expiresAt). `CrmOAuthService.ensureFreshToken` (`apps/server/src/services/CrmOAuthService.ts:44-63`) transparently refreshes when <60s from expiry and persists back. Nothing to build here.
- The Picker flow (`GoogleSheetsService.ts:63-67`, `pickerToken`) already hands the frontend a short-lived token for Google's Picker widget without ever exposing the refresh token — directly reusable for "choose the sheet to sync to."

### 2.2 The existing write path does not solve the actual problem

`GoogleSheetsService.exportContacts` (`apps/server/src/services/GoogleSheetsService.ts:72-102`, via `createExportSpreadsheet` in `apps/server/src/lib/crm/googleSheets.ts:245-276`) creates a **brand-new spreadsheet every call** and does one `PUT .../values/'Sheet1'!A1` that overwrites the entire grid. There is no per-row, match-by-key update logic anywhere in this codebase. "Stable row identity using the goal ID, so updates modify the same row" is genuinely new work, not a reuse of something that already exists.

### 2.3 Where the connection should live

`Integration.provider` already has a `GOOGLE_SHEETS` value, but `@@unique([businessId, provider, externalAccountId])` (`schema.prisma:2561`) means a _second_ `Integration` row for the same Google account (one for CRM import, a new one for schedule export) would collide. The clean fit — already the established pattern via `ImportSource` (`schema.prisma:2566`), which hangs off an `Integration` by FK rather than being a second `Integration` row — is to do the same thing for the outbound direction: **one new small model, FK'd to the business's existing `GOOGLE_SHEETS` `Integration`**, not a schema change to `Integration` or its `SyncDirection` enum at all.

- `Integration` already carries `lastSyncAt`/`lastSyncAttemptAt`/`lastSyncError` (`schema.prisma:2539-2541`) — proof this exact bookkeeping shape is already the house style; the new model gets its own copies rather than overloading the shared `Integration` row (a business's CRM-import sync status and its schedule-sync status are different things).

### 2.4 `ScheduledGoal` → column mapping

Every requested column maps directly, no schema gap:

| Sheet column        | Source                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date / Time         | `scheduledFor` (+ `hasTime` decides whether Time is shown)                                                                                              |
| Task                | `title`                                                                                                                                                 |
| Assignee            | `assignedToUserId` → `User.email` (no name field exists anywhere in this codebase — confirmed during the prior epic; email is the best available)       |
| Estimate            | `estimateMinutes`, formatted                                                                                                                            |
| Status              | `status` enum (`SCHEDULED`/`DONE`/`DISMISSED`) → a plain string, trivial                                                                                |
| Created by          | `createdByUserId` → `User.email`                                                                                                                        |
| Actual tracked time | **New**: `sum(endedAt - startedAt)` on `TimeEntry` grouped by `scheduledGoalId`. No existing helper computes this; it's a fresh, cheap (indexed) query. |

### 2.5 Sync trigger — a poller, not a hook in `CalendarService.ts`

Seven call sites create/update a `ScheduledGoal` today (`CalendarService.ts`: `scheduleIdea` L320, `updateGoal` L415, `upsertCrmNextActionGoal` L472, `dismissCrmNextActionGoal` L512, `completeCrmWorkOnActivity` L537, `completePagePublishGoals` L551, `syncTrackedGoals` L715). Hooking all seven would be invasive — and `CalendarService.ts` is currently active, shared territory. It isn't necessary: `ScheduledGoal.updatedAt` (Prisma `@updatedAt`) already bumps on every one of those seven paths. `worker.ts` already runs ~9 interval-based pollers (`apps/server/src/worker.ts:16-74`) — that's the established idiom here, not inline synchronous writes. A poller querying `where: { businessId, updatedAt: { gt: lastSyncAt } }` gets "sync on create/update/reassign/complete" for free, with **zero changes to `CalendarService.ts`**.

---

## 3. Data model

```prisma
model ScheduleSyncTarget {
  id                String    @id @default(cuid())
  businessId        String
  integrationId     String    // FK to the business's existing GOOGLE_SHEETS Integration
  spreadsheetId     String
  spreadsheetName   String
  sheetTab          String    // dedicated tab name, e.g. "Loopie Schedule" — never shares a tab
                               // with anything else, so a full-column-A read is always ours alone
  lastSyncAt        DateTime?
  lastSyncAttemptAt DateTime?
  lastSyncError     String?   @db.Text
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  business    Business    @relation(fields: [businessId], references: [id])
  integration Integration @relation(fields: [integrationId], references: [id])

  @@unique([businessId]) // one connected sheet per business, per the spec
}
```

No changes to `Integration`, `SyncDirection`, or `CalendarService.ts`.

**Row identity — column A, not a remembered row number.** The sheet's column A holds the `ScheduledGoal.id` (labeled "Loopie ID," left visible rather than hidden — a hidden column a user might unhide-and-edit is worse than a visible one they know not to touch). On every sync: one `values.get` read of column A gives a live `goalId → rowNumber` map; each changed goal either gets a targeted `values.update` to its known row, or — if its id isn't in the map — an `values.append`. This is deliberately **not** backed by a separate row-number-memory table: deriving row position fresh from the sheet's own current state every sync means a user reordering or inserting rows in the sheet can't silently corrupt which row a future update lands on. The cost is one extra read call per sync batch — negligible.

**Never deletes rows.** A `DISMISSED` or otherwise-gone goal just shows its last-synced state; no `ScheduledGoal` delete endpoint exists today anyway. Deleting sheet rows via the Sheets API shifts every row below it, which would require re-deriving the whole column-A map mid-batch — real complexity for a V1 that doesn't need it. Parking-lot item, not a gap.

---

## 4. API surface

| Operation                  | Method / path                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `createScheduleSyncTarget` | `POST /integrations/{id}/schedule-sync` — body: `{ spreadsheetId, spreadsheetName, sheetTab }` (post-Picker) |
| `getScheduleSyncTarget`    | `GET /integrations/{id}/schedule-sync` — status: `lastSyncAt`, `lastSyncError`, spreadsheet/tab identity     |
| `syncScheduleNow`          | `POST /integrations/{id}/schedule-sync/sync` — the "Sync now" button; same code path the poller uses         |
| `deleteScheduleSyncTarget` | `DELETE /integrations/{id}/schedule-sync` — disconnect (does not touch the sheet itself)                     |

New `ScheduleSyncService` (mirrors `ImportSourceService`'s role, opposite direction): `sync(targetId)` does the column-A read + upsert/append pass and updates `lastSyncAt`/`lastSyncError`; called by both the manual endpoint and the new poller.

---

## 5. Frontend

A small new page, e.g. `GoogleSheetsScheduleSyncPage.tsx`, linked from `IntegrationsPage.tsx` alongside the existing Google Sheets (import) entry — a clearly separate card, since this is the opposite direction of data flow, not a second tab on the same page:

- Not-connected state: "Connect a sheet" → Picker → tab-name field → `createScheduleSyncTarget`.
- Connected state: spreadsheet name (linked out), last sync time, error banner if `lastSyncError` is set, a "Sync now" button, "Disconnect."

No changes to Calendar's own UI (`CalendarPage.tsx`) — this is a one-way projection outward, nothing about how tasks are created/viewed changes.

---

## 6. Roadmap

**Phase A — Schema + connection.** `ScheduleSyncTarget` model + migration. `createScheduleSyncTarget`/`getScheduleSyncTarget`/`deleteScheduleSyncTarget` endpoints, reusing the existing Picker/OAuth flow verbatim.

**Phase B — `ScheduleSyncService.sync()`.** Header row bootstrap on first sync; column-A read → id map; per-changed-goal update-or-append; the `TimeEntry` aggregation query for "actual tracked time"; `lastSyncAt`/`lastSyncError` bookkeeping.

**Phase C — Trigger.** A new `worker.ts` poller (businesses with a target + any `ScheduledGoal` with `updatedAt > lastSyncAt`) calling the same `sync()`; `syncScheduleNow` endpoint for the manual button.

**Phase D — Frontend.** `GoogleSheetsScheduleSyncPage.tsx` + `IntegrationsPage.tsx` entry point.

**Phase E — Verification.** Integration tests against a fake Sheets connector (matching this codebase's existing pattern for Google Sheets tests — real network calls are never made in the test suite); a live Playwright pass only if a safe way to point at a real disposable test spreadsheet exists, otherwise this stays server-test-verified like the rest of the Sheets integration.

## 7. Deliberately out of scope for V1

Two-way sync; row deletion on the sheet side; sheet formatting/styling beyond plain values; more than one connected sheet per business; filtering which goals sync (V1 syncs every `ScheduledGoal` for the business, unbounded — sheet growth over time is an accepted tradeoff, not a launch blocker); any change to `CalendarService.ts` or Calendar's own UI.

## 8. Status (2026-09-10) — Shipped as designed

Built exactly to the plan above, no deviations:

- **Schema**: `ScheduleSyncTarget` (FK to the existing `GOOGLE_SHEETS` `Integration`, no changes to `Integration`/`SyncDirection`), migration applied to both dev databases the same way every migration in this epic was (`db push` + hand-written migration file, since the shared `loopie` user has no `CREATE DATABASE` right for Prisma's shadow-db diffing).
- **Sheets API**: two new helpers added to the existing `lib/crm/googleSheets.ts` (`batchUpdateValues`, `appendValues`) alongside the pre-existing read/create helpers — reused, not duplicated.
- **`ScheduleSyncService`**: `create`/`get`/`delete` mirror `ImportSourceService`'s exact shape; `sync()` reads column A once per run, diffs every `ScheduledGoal` with `updatedAt` newer than the last successful sync, and batch-updates or appends accordingly; the same compare-and-swap lock idiom (`lockToken`/`lockExpiresAt`) `ImportSource` already uses prevents a manual "Sync now" and the poller from racing each other.
- **Trigger**: `runDueScheduleSyncs` in `worker.ts`, a plain interval poller alongside the ~9 that already exist there — `CalendarService.ts` was never touched.
- **Frontend**: `GoogleSheetsScheduleSyncPage.tsx` (connect via the existing `GoogleSheetPicker`, status card, Sync now, Disconnect), linked from `GoogleSheetsAccountsPage.tsx` alongside the existing "Manage sources" button. `CalendarPage.tsx` untouched, as planned.
- **Tests**: `scheduleSync.test.ts` (6 tests, extending the same fake-Sheets-API convention `importSources.test.ts` already established) — covers not-connected, rejecting an invalid tab, the header-write + update-not-duplicate row lifecycle across a real status change, actual-tracked-time from a real `TimeEntry`, concurrent-sync rejection, and cross-business isolation + disconnect. Full server suite green throughout (588 passed, 0 failed, up from 582 before this feature). Frontend: `tsc`/`eslint` clean; a live-browser check confirmed the modified `GoogleSheetsAccountsPage.tsx` still renders correctly (a full OAuth-connect click-through wasn't feasible in this environment — no real Google credentials to authorize against — so the connect→sync→disconnect lifecycle is verified at the integration-test level, against a faked Sheets API, rather than end-to-end in a real browser).
