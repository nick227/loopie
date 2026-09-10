# Calendar ownership

`CalendarPage.tsx` composes the feature. Keep calculations, mutations, form state,
and individual query-state rendering in the modules below.

| Change                                                                        | Owner                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| Defaults, estimate presets, scheduling targets, display caps, timer threshold | `calendar.config.ts`                                    |
| URL state and navigation transitions                                          | `hooks/useCalendarNavigation.ts`                        |
| Board/range reads, filtering, independent loading/error/retry states          | `hooks/useCalendarData.ts`                              |
| Local date inputs, ISO conversion, date labels, month interval                | `calendar.dates.ts`                                     |
| Grouping, assignee filtering, day/month summaries, timer picks                | `calendar.selectors.ts`                                 |
| List and grid composition                                                     | `views/`                                                |
| Goal/idea mutations and form drafts                                           | `components/GoalRow.tsx`, `components/IdeasSection.tsx` |
| Create then schedule, pending guard, partial-failure retry                    | `hooks/useQuickAddTask.ts`                              |
| Start/stop work and correction flow                                           | `tracking/TimeTracker.tsx`                              |
| Shared timer refresh lifecycle                                                | `tracking/useElapsedMinutes.ts`                         |
| Transport, query keys, invalidation                                           | `packages/sdk/src/hooks/useCalendar.ts`                 |

`CalendarPrimitives.tsx` contains the small shared section, estimate picker, and
query-feedback UI. Other small components remain private to their feature module.

## Navigation contract

The URL owns `view`, `mode`, `date` (anchor), `selected`, `assignee`, and `goal`.
A `date` link without an explicit view opens Calendar and selects that day.
Both local `YYYY-MM-DD` and ISO assignment-link timestamps are accepted.
`selected=none` explicitly closes selection while preserving the anchor.
Navigation preserves unrelated query parameters and uses browser history.

Calendar data remains two projections of scheduled goals. The board supplies
Today/This Week/Recently Completed/Ideas; the range query supplies Month/Year.
A range error must not hide the board, and a board error must not hide the grid.
The SDK range hook accepts `enabled`; List view does not fetch that range.

## Workflow guarantees

Quick-add retains a successfully created template while its form stays mounted.
Retrying the same title retries scheduling; changing the title starts a new idea.
The original idea remains available if scheduling fails. This is not durable
idempotency across reloads or an ambiguous network timeout; that would require
an API-level idempotency contract.

All-day dates encode local midnight as an ISO instant. Timed input conversion
rejects invalid local times, including times skipped at a DST boundary. The
same month interval generates both query boundaries and visible grid days.

## Verification

From the repository root:

```sh
pnpm --filter web typecheck
pnpm --filter @project/sdk typecheck
pnpm exec eslint apps/web/src/pages/calendar packages/sdk/src/hooks/useCalendar.ts --max-warnings 0
TZ=America/Chicago pnpm --filter web exec vitest run src/pages/calendar
TZ=UTC pnpm --filter web exec vitest run src/pages/calendar/calendar.dates.test.ts
pnpm --filter web exec playwright test e2e/calendar.spec.ts
```

The browser suite requires the local app/API and its seeded demo data.
