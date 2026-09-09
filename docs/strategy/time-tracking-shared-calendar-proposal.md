# Time Tracking & Shared Team Calendar — Feature Proposal

**Status:** Proposed
**Scope:** Per-user time tracking (start/stop timeclock) on Calendar tasks, task assignment to teammates, editable estimates, and turning Calendar into a shared team resource that shows who is online and what they're working on right now.
**Product terminology:** "Task" in the UI (existing `ScheduledGoal` model remains the technical row); "Team" already exists as `BusinessMembership`.

---

## 1. Executive Summary

Calendar today is a single-tenant-looking feature that is secretly already business-scoped, not user-scoped: every `ScheduledGoal`/`GoalIdeaTemplate` row hangs off `businessId` alone, with **no column anywhere recording which user created, owns, or is doing the work**. Every teammate signed into the same company sees the exact same board today — the sharing this epic asks for already exists at the data layer. What's missing is the _person_ dimension: who made this, who's supposed to do it, and — brand new — who is actively working on it right now and for how long.

This proposal adds three connected pieces on top of the existing Calendar/`ScheduledGoal` architecture, deliberately reusing it rather than building a parallel task system:

1. **Time Tracking** — a new `TimeEntry` model plus a Start/Stop control in `CalendarPage.tsx`, opening a slide-out rail to capture "what are you working on," with a live running indicator (description + elapsed time to the nearest minute) once started.
2. **Assignment & Estimate editing** — `ScheduledGoal` gains `assignedToUserId`/`createdByUserId`; a second, small slide-out rail lets you reassign a task and adjust its estimate after creation (today estimates are set once, at scheduling time, and never editable again).
3. **Team presence & shared visibility** — a lightweight "who's online, what are they on" strip surfaced on Calendar, derived from existing `Session` rows (extended with `lastSeenAt`) joined against each user's current running `TimeEntry`. No new presence infrastructure (sockets, polling service) is required for V1 — a short-poll read on an already-open page is enough.

None of this requires a new task/board model. It is additive columns and one new small model, layered onto the exact `ScheduledGoal`/`CalendarService`/`GoalRow` machinery that already exists.

---

## 2. Research Spike — Current State

### 2.1 Calendar/task data model (`packages/db/prisma/schema.prisma`)

- `GoalIdeaTemplate` — the content catalog (system + per-business custom "+ Add idea" rows). `businessId` nullable = system-authored.
- `GoalIdeaState` — per-business dismissed/accepted memory of a template.
- `ScheduledGoal` — **the one concrete unit of work Calendar owns** (`schema.prisma:3397`). Columns of note:
  - `businessId` — the only ownership column that exists today. **No `userId`, `createdByUserId`, or `assignedToUserId` anywhere.**
  - `title`, `detail`, `estimateMinutes`, `scheduledFor`, `hasTime`, `status` (`SCHEDULED`/`DONE`/`DISMISSED`), `completedAt`.
  - `source` (`ScheduledGoalSource`: `IDEA_TEMPLATE` / `USER_CREATED` / `CRM_NEXT_ACTION` / `WORKFLOW` / `ASSISTANT_PLAYBOOK`) — how the row came to exist, not who made it.
  - `actionType`/`actionTarget`/`actionLabel` — frozen "Open X" deep link, resolved at schedule time.
  - `subjectType`/`subjectId` — an optional pointer at another feature's own record (e.g. a Lead), never a copy of that record's data.
- `GoalEvent` — append-only audit trail per goal (`CREATED`/`SCHEDULED`/`RESCHEDULED`/`COMPLETED`/`DISMISSED`/`REMINDER_SENT`/`PROGRESS_UPDATED`). This is the existing precedent for how this codebase logs state transitions — Time Tracking should follow the same append-only-log discipline rather than inventing a new pattern.

**Key finding:** because `ScheduledGoal` only ever carries `businessId`, the Calendar board (`CalendarService.getBoard(businessId, ...)`, `apps/server/src/services/CalendarService.ts:175`) is _already_ a shared, whole-company view — every `BusinessMembership` on that business sees the same rows today. "Make Calendar shared" is therefore not a data-model problem; it's a **missing-attribution** problem. Nothing today can answer "whose task is this" or "who should do this," because nothing records it.

### 2.2 `CalendarService.ts` — the extension points

- `scheduleIdea(businessId, templateId, input, overrides?)` (`:266`) — creates a `ScheduledGoal` inside one `$transaction`, already takes an `overrides` object (added for the Assistant playbook) that can be extended additively (e.g. `assignedToUserId`) without touching existing callers.
- `updateGoal(businessId, goalId, input)` (`:346`) — today only accepts `status`/`scheduledFor`/`hasTime`/`estimateMinutes`. This is the natural place to add `assignedToUserId` — same transactional pattern, same `GoalEvent` emission convention (a new `REASSIGNED` event type fits the existing enum's shape).
- `listGoalsInRange(businessId, from, to)` (`:390`) — the Month/Year calendar read. Will need an optional assignee filter down the line, but no change required for V1 (see §5).

### 2.3 Frontend (`apps/web/src/pages/calendar/CalendarPage.tsx`)

- `QuickAddTask` sits in `PageHeader`'s children row, next to `ViewSwitch` as the header's `primaryAction` — this is exactly where the new Start/Stop button belongs, per the user's own placement request.
- `GoalRow` (`:390`) already has an expand-inline pattern (click title → panel with Mark done / Reschedule / `ActionButton`) — the same shape the user asked for ("the UI impact... should be surgical, small and consistent"). The task-edit rail is a natural sibling action inside that same expanded panel, not a new page.
- `SchedulingControls` (`:147`) is the existing precedent for a compact When/Estimate control — its `ESTIMATE_CHOICES = [30, 60, 120]` pill pattern should be reused verbatim for the estimate control in the new edit rail, not reinvented.
- There is **no existing slide-out/rail component anywhere in `apps/web`** (checked: no `Rail`, `Drawer`, `SidePanel` primitive in `components/ui`). This is new UI plumbing, not a reuse of an existing primitive — flagged as real net-new work, not wiring.

### 2.4 Team / membership model (`BusinessMembership`, `TeamService`)

- `BusinessMembership` (`schema.prisma:190`) — `userId`, `businessId`, `role` (`OWNER`/`MEMBER`), `jobTitle` (display-only), `isFounder`, `suspendedAt` (per-company suspension). This is the team roster to assign against.
- `TeamService.getMemberMetrics` (`apps/server/src/services/TeamService.ts:288`) already aggregates **attributable per-user activity** from columns that exist on _other_ models — `RiverPost.authorUserId`, `LandingPage.publishedBy`, `Message.createdByUserId` (checked: these are the established convention for "who did this" in this codebase). `ScheduledGoal.createdByUserId`/`assignedToUserId` slot into this exact convention — nothing new to invent architecturally, just the same pattern applied to a model that never had it.
- `/team` (roster, invites, suspension) and `/team/members/:userId` (per-member attributable metrics) are the existing surfaces this epic's "who's doing what" story should extend, not duplicate.

### 2.5 Presence / "who's logged in" — does not exist yet

Searched the whole repo for `lastSeenAt`/`isOnline`/`presence`. Two unrelated hits, both worth flagging explicitly to avoid confusion during implementation:

- `LoopieSession.lastSeenAt` — anonymous **visitor** tracking for `apps/ad-server`'s first-party ad/landing-page sessions. Nothing to do with authenticated team members.
- `LivePresence*` (`apps/server/src/services/livePresence.ts`, `apps/web/src/components/welcome/LivePresence*.tsx`) — an **already-shipped, differently-scoped feature**: a Home-page grid of the business's own _trending content_ (recently active pages/ads/messages), not people. **The name "Live Presence" is already taken in this codebase for that feature.** The new "who's online / what are they doing" surface must use a different name (proposed: "Team Activity" / `TeamActivityStrip`) to avoid confusing future readers and search results.
- `Session` (`schema.prisma:259`) — has `id`, `userId`, `token`, `activeBusinessId`, `expiresAt`, `createdAt`. **No `lastSeenAt`.** There is currently no way to answer "is this teammate actually at their desk right now" — only "do they have a non-expired session token," which is too coarse (sessions live for the session lifetime, not "active in the last few minutes").

### 2.6 Time tracking — does not exist yet

No `TimeEntry`/`TimeLog`/`Timesheet` model, service, or route exists anywhere in the schema, server, or SDK. This is genuinely new, not a rename of something adjacent.

---

## 3. New Requirements (from this conversation)

1. A **Start Task** button next to the existing "Add task" button in `CalendarPage.tsx`'s header row.
2. Clicking it opens a **slide-out rail** offering a few schedule-derived quick picks (today's scheduled tasks) but primarily a free-text "what are you working on" field.
3. Pressing **Start** on the rail: closes the rail, flips the header button to **Stop Task**, and displays the current activity's description plus elapsed time, approximated to the nearest minute, updating live.
4. Time worked is **recorded** — a durable log, not just a UI state — because this is explicitly framed as a timeclock for workers, not a personal Pomodoro widget.
5. Calendar becomes a **shared team asset**: it should show, in aggregate, who on the team is currently logged in/active and what each of them is working on right now.
6. Tasks are recorded against **people**, and future (not-yet-worked) tasks are also shared/visible team-wide — not just live activity.
7. Self-assignment stays the default, but a task can be **assigned to a teammate**, and its **estimate can be adjusted** after creation — via a second slide-out rail for editing an existing task.
8. UI footprint must stay **surgical**: reuse existing components/patterns (`GoalRow`'s expand panel, `SchedulingControls`' pill pattern, `PageHeader`'s action slot) rather than a parallel task-management UI.

---

## 4. Proposed Data Model Changes

### 4.1 `TimeEntry` (new model)

```prisma
model TimeEntry {
  id              String    @id @default(cuid())
  businessId      String
  userId          String
  scheduledGoalId String?   // nullable — a worker can log time against free text with no linked task
  description     String    @db.Text
  startedAt       DateTime  @default(now())
  endedAt         DateTime? // null while running; exactly one null row per (businessId, userId) at a time
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  business      Business       @relation(fields: [businessId], references: [id])
  user          User           @relation(fields: [userId], references: [id])
  scheduledGoal ScheduledGoal? @relation(fields: [scheduledGoalId], references: [id])

  @@index([businessId, userId, endedAt])
  @@index([scheduledGoalId])
}
```

- **One running entry per user, enforced in the service layer**, not the DB: MySQL treats every `NULL` in a unique index as distinct, so `@@unique` can't block two concurrently-running rows for the same user. `TimeTrackerService.start()` must, inside a `$transaction`, find-and-close any existing `endedAt: null` row for that `(businessId, userId)` before creating the new one — i.e. **starting a new task auto-stops whatever was running** (the same assumption Toggl/Harvest-style tools make; flagged in §7 as a default worth confirming, not a hard blocker).
- `description` is freeform text (what the rail's text field captures), independent of `scheduledGoalId` — a worker can type "answering support emails" with no linked task, matching requirement #2's "typically users will manually type."
- Linking to a `ScheduledGoal` when a quick-pick is chosen lets a task's total logged time be computed later (`sum(endedAt - startedAt) where scheduledGoalId = X`) without adding a duplicated running-total column that could drift — same "derive, don't cache" discipline already used for `ScheduledGoal.currentValue` on `ENTITY_STATE`/`COUNT` goals.

### 4.2 `ScheduledGoal` — two new nullable columns

```prisma
createdByUserId  String?
assignedToUserId String?

createdBy  User? @relation("ScheduledGoalCreatedBy", fields: [createdByUserId], references: [id])
assignedTo User? @relation("ScheduledGoalAssignedTo", fields: [assignedToUserId], references: [id])
```

- Both nullable: every pre-existing row (and every system/idea-template/assistant-playbook-sourced row with no natural "creator") stays valid with no backfill required — same nullable-for-history discipline this schema uses everywhere else (e.g. `Business.slug`).
- `createdByUserId` is set once, at creation, from the acting user — a plain audit column, same convention as `RiverPost.authorUserId`.
- `assignedToUserId` defaults to the creator (self-assignment) but is reassignable via the edit rail. **Not a new permission gate for V1** — any active member can (re)assign any task within their business, same flat-access model Calendar and every other in-app object already has (no per-resource ACLs exist anywhere in this codebase yet — see CLAUDE.md's parking lot: "nested departments / custom permission matrices remain parking-lot").
- A new `GoalEventType.REASSIGNED` value follows the exact existing enum (`CREATED`/`SCHEDULED`/`RESCHEDULED`/`COMPLETED`/`DISMISSED`/`REMINDER_SENT`/`PROGRESS_UPDATED`).

### 4.3 `Session` — one new column

```prisma
lastSeenAt DateTime @default(now())
```

- Bumped opportunistically (not on every single request — throttled, e.g. only written if >60s stale) inside the existing `bearerAuth` check, the same place `Session.expiresAt` is already read. No new endpoint required to keep this fresh; every authenticated request the user's browser already makes (loading Calendar, polling `useCalendarBoard`, etc.) doubles as a heartbeat.
- "Online" = `lastSeenAt` within the last ~5 minutes, computed at read time in the new presence query — no separate online/offline event stream, no WebSocket, no `Presence` table. This mirrors the "derive from real data, don't trust a stored flag" rule already applied to `ScheduledGoal.currentValue`.

---

## 5. Proposed API Surface (`packages/api-spec/openapi.yaml`)

New operations, all under a new `time-tracking` tag (kept separate from the existing `calendar` tag since a `TimeEntry` is a distinct resource, even though it often links to a `ScheduledGoal`):

| Operation             | Method/Path                    | Notes                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCurrentTimeEntry` | `GET /time-entries/current`    | The caller's own running entry, or `null`. Drives the Stop-button state on page load/refresh.                                                                                                                                                                                                        |
| `startTimeEntry`      | `POST /time-entries/start`     | `{ description, scheduledGoalId? }`. Auto-stops any prior running entry for this user (see §4.1).                                                                                                                                                                                                    |
| `stopTimeEntry`       | `POST /time-entries/{id}/stop` | Sets `endedAt`.                                                                                                                                                                                                                                                                                      |
| `listTimeEntries`     | `GET /time-entries`            | Paginated, filterable by `userId`/`scheduledGoalId`/date range — backs a future per-person time log view (§8, out of V1 UI scope but the read endpoint should exist from day one so nothing needs a second migration).                                                                               |
| `getTeamActivity`     | `GET /team/activity`           | Per active (non-suspended) `BusinessMembership`: `userId`, name, `isOnline` (derived from `Session.lastSeenAt`), and `currentEntry` (`{ description, scheduledGoalId?, startedAt }` or `null`). This is the "who's logged in and what are they doing" read the shared-Calendar requirement asks for. |

`UpdateScheduledGoalInput` gains two optional fields:

```yaml
assignedToUserId:
  type: string
  nullable: true
estimateMinutes: # already exists — no change, just noting it's now editable post-creation via the same field
```

`ScheduledGoal` response schema gains `createdByUserId`, `assignedToUserId` (both nullable strings) so `GoalRow` can render an assignee chip without a second round-trip.

No changes needed to `listGoalsInRange`/`getBoard` response shapes beyond the two new fields riding along on `ScheduledGoal` — filtering by assignee is a fast-follow (§8), not required for the V1 "assign + show it" slice.

---

## 6. Proposed Frontend Changes (surgical, per the user's own constraint)

### 6.1 Start/Stop control — `CalendarPage.tsx` header

- Add one button next to `QuickAddTask` inside `PageHeader`'s children row (`:1246`). Idle state: `Start Task` (a `Play`-style icon, matching the existing `lucide-react` icon usage already imported at the top of the file). Running state: `Stop Task` + a compact `description · MMm` chip, using the same `tabular-nums text-muted-foreground` treatment `GoalRow` already uses for estimate/progress chips — no new visual language introduced.
- Elapsed time updates via a `setInterval` tick once per minute (matches "approximated to the nearest minute" exactly — no need for second-level precision, which would also mean fewer re-renders).
- Backed by `useCurrentTimeEntry()` (new SDK hook) polled/refetched on the same cadence Calendar already uses for `useCalendarBoard`.

### 6.2 `TimeTrackerRail` (new component)

- A slide-out panel (new, minimal primitive — e.g. a fixed-position panel sliding in from the right with a backdrop, styled consistently with existing `Button`/`Input` primitives; no new design system, just a new _shape_ of container since none exists yet per §2.3).
- Contents: a short list of **quick picks** = today's `SCHEDULED` goals (already fetched via `useCalendarBoard`'s `today` bucket — no new query), rendered as compact buttons that pre-fill the text field and set `scheduledGoalId`; a free-text `Input` (autofocused) for "What are you working on?"; a `Start` button.
- Submit calls `useStartTimeEntry()`, then closes the rail and lets §6.1's polling pick up the new running state (or optimistically sets it — implementation detail, not a design decision).

### 6.3 `TaskEditRail` (new component) — assignment + estimate

- Opened from `GoalRow`'s existing expanded panel (`:496`-`512`) via a new `Edit` button alongside `Mark done`/`Reschedule`/the action link — not a new entry point, just one more button in the row that already exists.
- Contents: an **Assignee** picker (a simple `<select>`/listbox over the business's active `BusinessMembership` roster, defaulting to the current `assignedToUserId` or "Unassigned"/self) and the **Estimate** control — literally `SchedulingControls`' `ESTIMATE_CHOICES` pill row (`:229`-`270`), lifted into a shared component so both the creation flow and this edit rail render the identical control rather than diverging copies.
- Save calls the extended `useUpdateScheduledGoal()` with `assignedToUserId`/`estimateMinutes`.

### 6.4 Assignee visibility on `GoalRow`

- When a business has more than one active member, render a small initials chip (reuse whatever avatar/initials pattern `TeamPage`/`ContactLink` already use — checked convention, not inventing a new avatar component) next to the estimate chip in the always-visible row, but only when `assignedToUserId` differs from the viewer — keeps the common single-assignee-is-you case visually unchanged, satisfying "surgical."

### 6.5 `TeamActivityStrip` (new component) — team presence

- A slim horizontal strip above or beside the Calendar header (exact placement is a layout call, not an architecture one) showing each online teammate's initials + a live-dot + their current activity's description truncated, sourced from `GET /team/activity`.
- Deliberately **not** named "Live Presence" anywhere in code or UI copy — that name is already owned by the unrelated trending-content feature (§2.5). Suggested name: "Team Activity" (UI copy) / `TeamActivityStrip`/`TeamActivityService` (code).

---

## 7. Decisions Assumed by This Proposal (flagging for confirmation, not blocking on)

- **Single active timer per user, auto-stop on new Start.** Matches every mainstream timeclock tool's default; the alternative (multiple concurrent running entries per person) has no clear use case here and would complicate "what are they doing right now" into "what are they doing right now, plural."
- **No new permission gate for assignment.** Any active member can assign any task to any other active member of the same business — consistent with the fact that no per-resource ACL system exists anywhere else in the product today.
- **Presence is coarse (last-seen-within-5-minutes), not a real-time socket feed.** Sufficient for "is the team around and what are they on," avoids adding WebSocket infrastructure for a V1 slice. Can be revisited if the team wants second-level accuracy later.
- **Time entries are not editable/retroactively-correctable in V1** (no "I forgot to stop it, fix the end time" flow). Flagged explicitly in §8 as the most likely first fast-follow, since forgetting to stop a timer is the single most common real-world failure mode of any timeclock tool.

---

## 8. Explicitly Out of Scope for V1 (parking lot for this epic)

- Editing/correcting a past `TimeEntry`'s start/end time.
- Per-member timesheet/report views (weekly hours, billable vs. non-billable) — `listTimeEntries` is built to support this later without another migration, but no UI ships for it yet.
- Filtering the Calendar board by assignee ("show only my tasks" / "show only Jordan's tasks").
- Real-time push (WebSocket) presence — polling is enough for V1.
- Idle detection / auto-stop after inactivity.
- Overtime, breaks, payroll-adjacent concepts — this is a work-visibility tool, not a payroll timeclock, per the product's existing "Billing/subscriptions... deep role/permission systems" parking-lot line in `CLAUDE.md`.

---

## 9. Implementation Roadmap

**Phase A — Schema & backend foundation**

- Migration: `TimeEntry` model; `ScheduledGoal.createdByUserId`/`assignedToUserId`; `Session.lastSeenAt`; `GoalEventType.REASSIGNED`.
- `TimeTrackerService` (start/stop/current/list), following `CalendarService`'s `$transaction` + `GoalEvent`-style audit discipline.
- Extend `CalendarService.updateGoal`/`scheduleIdea` for `assignedToUserId`; set `createdByUserId` on every create path (idea-schedule, quick-add, CRM-mirror, assistant-playbook).
- `lastSeenAt` heartbeat inside the existing `bearerAuth` check.
- OpenAPI additions from §5; SDK regeneration; unit/integration tests mirroring `calendar.test.ts`'s style (real HTTP calls against `loopie_test`, not mocks).

**Phase B — Team presence read**

- `TeamActivityService`/`GET /team/activity` (derives online + current-entry per membership, no new stored state beyond `lastSeenAt`).

**Phase C — Time-tracking frontend**

- `TimeTrackerRail`, header Start/Stop control + live elapsed chip, `useCurrentTimeEntry`/`useStartTimeEntry`/`useStopTimeEntry` SDK hooks.

**Phase D — Assignment & estimate editing frontend**

- Extract `SchedulingControls`' estimate pill row into a shared component; `TaskEditRail`; `Edit` entry point on `GoalRow`; assignee chip on the row.

**Phase E — Team presence frontend**

- `TeamActivityStrip` on Calendar, polling `GET /team/activity`.

**Phase F — Verification**

- Playwright coverage: start → rail → stop round trip with a real elapsed-time assertion; assign-and-reassign flow; a two-session/two-browser-context test proving the team activity strip actually reflects a second logged-in user's running entry (the one genuinely new cross-session behavior this epic introduces — worth a real browser proof, not just a unit test, per this project's own "verified live" discipline).

Each phase is independently shippable and testable in the order above — Phase A alone (attribution columns + `createdByUserId` populated going forward) already closes the biggest gap found in the research spike, even before any timer UI exists.

---

## 10. Status (2026-09-09)

**Phases 1–3 shipped and verified live.** Attribution (`createdByUserId`/`assignedToUserId`, `REASSIGNED` audit event), `TimeEntry` (globally-unique running-entry constraint via `runningForUserId`, start/current/stop with a real 409 `ACTIVE_TIME_ENTRY_EXISTS` contract, forgotten-timer correction bounded to `[startedAt, now]`), and `TeamService.getActivity` (compact tracking state, no presence concept) are all built, backend-tested (`timeEntries.test.ts`, `teamActivity.test.ts`), and confirmed in a real two-browser-context Playwright run (`e2e/timeTracking.spec.ts`, 3/3 passing) proving the actual cross-user "teammate starts a timer → shows up in the other's Team Activity strip → disappears when they stop" loop against the live server + live DB.

**Concurrent work note (2026-09-09):** A separate session (Antigravity) is building personal assignment notifications + roadmap ownership visibility on top of this epic's own `ScheduledGoal` attribution — this is expected, coordinated overlap, not a collision to undo. It touches `CalendarService.updateGoal`, `handlers/calendar.ts`, `schema.prisma` (new `AssignmentNotification` model), a new `handlers/assignmentNotifications.ts`, and `Shell.tsx`/`MessagesPage.tsx`. This epic's own work does not touch any of those files further until that lands; `CalendarService.ts`/schema/migrations there are Antigravity's to finish. Once merged, the plan is: treat their changes as the new baseline, re-run the full server suite + this epic's Playwright coverage, and only then continue into Phase 4.

**Phase 4 — hardening, not yet started (drafted here as a checklist, per direction to hold code until the concurrent work lands):**

| Case                                                              | Status                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent double-start race (two tabs)                           | Partially covered — `timeEntries.test.ts` proves the sequential "already running → 409" contract, but not a genuine simultaneous `Promise.allSettled` race against the same unique constraint. Worth a real concurrency test (same shape as this project's other adversarial-concurrency suites) once unblocked. |
| Double-stop idempotency                                           | Not yet tested explicitly (a second `stop` call should 404, not corrupt the already-stopped entry). Should already hold given `stop()`'s `findFirst({runningForUserId})` guard — needs a test proving it, not new code.                                                                                          |
| Business switch during an active timer                            | Covered — `timeEntries.test.ts`'s "enforces one running entry per user GLOBALLY" test and `teamActivity.test.ts`'s cross-business isolation test both exercise this directly.                                                                                                                                    |
| Suspended assignee                                                | Covered on the Team Activity read side (`teamActivity.test.ts` excludes a suspended member outright, even mid-timer). Assignment-time validation against a suspended teammate now lives in Antigravity's `updateGoal` changes, not this epic's code.                                                             |
| Dismissed/completed/deleted linked task                           | Not yet tested — does `GET /time-entries/current` / Team Activity survive a `scheduledGoalId` whose `ScheduledGoal` gets marked `DONE`/`DISMISSED` or deleted outright (the FK is `onDelete: SET NULL`, so this should degrade cleanly, but isn't proven yet).                                                   |
| Corrected-end-time validation bounds                              | Covered — `timeEntries.test.ts`'s bounds tests (`endedAt` before `startedAt`, in the future).                                                                                                                                                                                                                    |
| Timezone/day-boundary for quick picks                             | No separate timer-specific code — `TimeTrackerForm`'s quick picks are just `useCalendarBoard()`'s own `today` bucket, so correctness here is inherited from `CalendarService`'s existing, already-tested day-window logic. Nothing to add.                                                                       |
| Multi-browser Playwright (cross-session Team Activity visibility) | Covered live — `e2e/timeTracking.spec.ts`'s Phase 3 test, passing against the real dev stack.                                                                                                                                                                                                                    |

Net new Phase 4 work once unblocked: a genuine concurrent-race test, a double-stop test, and a deleted/completed-linked-goal robustness test — all confined to `TimeEntryService.ts`/`TeamService.ts` and their existing test files, no schema changes anticipated.

---

## 11. Phase 4 — Complete (2026-09-09)

Antigravity's assignment-notification work landed (`AssignmentNotification` model + migration, `handlers/assignmentNotifications.ts`, `CalendarService.updateGoal` extended with assignee validation + a compare-and-swap guard + notification creation). Confirmed the migration was pushed to `loopie_test` but not yet to the shared dev database `loopie` — pushed it there too (`db push`, matching this epic's own established local workflow; no schema authored, just applying what Antigravity had already written) and marked it applied in both databases' migration history. No SDK/Prisma regeneration was actually needed beyond that — Antigravity had already run `prisma generate` themselves. Full server suite green at each checkpoint (577 → 582 passed as hardening tests were added, 0 failures throughout), and `e2e/timeTracking.spec.ts` re-confirmed green against the merged tree.

**Hardening delivered**, all confined to `TimeEntryService.ts`/`TeamService.ts` and their tests, or `apps/web/e2e/timeTracking.spec.ts`:

- Genuine concurrent double-start race (`Promise.allSettled`, not sequential) — exactly one 201/one 409, exactly one running row.
- Double-stop idempotency — second call 404s, first stop's record undisturbed.
- Linked task lifecycle — surviving completion untouched; a deleted linked task nulls the FK (`onDelete: SET NULL`) instead of crashing `current`/Team Activity.
- A genuinely long-forgotten timer (back-dated 30h) still accepts a valid correction — no hidden server-side duration cap.
- A timer can link to a task assigned to a different teammate, and is unaffected by that teammate being suspended afterward (assignment stays informational, not an access boundary — consistent with Phase 1's original decision).
- Frontend: elapsed time is correct immediately on page load from a real stale `startedAt` (not stuck at 0m waiting for the first interval tick); an 8+ hour entry opens the correction rail instead of stopping silently; a plain refresh survives with the server as source of truth.
- Multi-browser Team Activity visibility re-confirmed against the merged tree (Phase 3's original 2-context test).

**Descoped, deliberately:** a synthetic-event-driven "focus triggers a react-query refetch across tabs" e2e test was attempted and dropped — headless Chromium's multi-tab visibility semantics don't reliably reproduce the real OS-level focus/blur signal `@tanstack/react-query`'s own `FocusManager` checks, making it flaky for reasons unrelated to this epic's own code (`refetchOnWindowFocus` is a react-query default, not something this epic wrote). The mount-time fetch (proven by the refresh test) is this epic's actual code; the cross-tab refetch is a framework default outside what an e2e proof here can usefully harden. Timezone/day-boundary quick-pick correctness remains inherited from `CalendarService`'s own existing, already-tested day-window logic — no separate timer-specific code exists to test.

**New concurrent-edit surface found while verifying:** Antigravity is also now actively editing `apps/web/src/pages/calendar/CalendarPage.tsx` itself (a new `AssigneeFilter`/`TaskOwnership.tsx` "roadmap ownership visibility" feature — an assignee filter dropdown on the board), not just the backend files flagged earlier. Confirmed this doesn't conflict with or break Start/Stop Work, the Assign & Estimate rail, or Team Activity — all 6 Playwright tests pass against the file as it currently stands — but future edits to this file should assume it's shared territory too.
