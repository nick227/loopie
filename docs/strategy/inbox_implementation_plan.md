# Merge Activity and Messages into a Unified Inbox

The current architecture separates system events (`ActivityItem`) and outgoing/incoming contact messages (`Message`) into two disparate surfaces (`/activity` and `/messages`). The user wants to pivot to an Inbox-centric model where system events are treated as messages to the user, grounding the application in the familiar paradigm of an email/SMS inbox.

## User Review Required

> [!WARNING]
> This plan proposes removing the recently built `ActivitySavedView` model and the `ActivitySidebar` (Saved Views/Default Views), as requested. Please confirm this is the desired path.

> [!IMPORTANT]
> How should we merge `ActivityItem` and `Message` data?
>
> **Option A (Recommended): Unified API Endpoint (`GET /inbox`)**
> We create a new endpoint that queries both `ActivityItem` and `Message` tables, merging them into a unified stream sorted by date. The frontend renders them in a single `VirtualInfiniteList`.
>
> **Option B: Dual Queries on Frontend**
> The frontend calls both `/activity` and `/messages` independently and merges the pages locally. This is easier to implement but makes pagination very complex.
>
> **Option C: Project Messages into ActivityItems**
> We update the `Message` service to emit an `ActivityItem` whenever a message is sent/received. The Inbox would simply read the `ActivityItem` stream. This aligns with the "additive, projection-based" architecture we've been building, but means the Inbox strictly reads from `ActivityItem`.

Please clarify which approach you prefer. I have proposed Option A / C hybrid in the plan below.

## Open Questions

- Should we rename the `/activity` and `/messages` routes entirely to `/inbox`, and remove the old pages?
- Do you want a split-pane layout (like an email client, with a list on the left and reading pane on the right), or a single stream like a social feed?

## Proposed Changes

---

### Backend API (`apps/server/src`)

#### [NEW] `handlers/inbox.ts`

Create a new endpoint `GET /inbox` that returns a unified stream of `ActivityItem` and `Message` records.

#### [DELETE] `handlers/activityViews.ts`

Remove the endpoints for managing `ActivitySavedView`.

#### [MODIFY] `packages/api-spec/openapi.yaml`

- Add `/inbox` route definitions.
- Remove `/activity/views` route definitions.
- Remove `/messages` endpoints if they are completely replaced by `/inbox` (or keep them for CRUD operations on individual messages).

---

### Database (`packages/db/prisma/schema.prisma`)

#### [MODIFY] `schema.prisma`

- Remove `model ActivitySavedView`.

---

### Frontend UI (`apps/web/src`)

#### [NEW] `pages/inbox/InboxPage.tsx`

Create the new unified Inbox page, pulling data from `useInboxStream` (a new hook).

#### [DELETE] `pages/activity/ActivitySidebar.tsx`

Remove the sidebar with "Default Views" and "Saved Views".

#### [MODIFY] `pages/activity/ActivityPage.tsx` & `pages/messages/MessagesPage.tsx`

Either delete these pages or redirect them to `/inbox`.

#### [MODIFY] `components/layout/Sidebar.tsx`

Update the main application navigation to replace "Activity" and "Messages" with a single "Inbox" navigation item.

## Verification Plan

### Automated Tests

- Update `activity.spec.ts` to `inbox.spec.ts`.
- Ensure E2E tests can navigate to `/inbox` and see both a seeded `ActivityItem` and a seeded `Message`.

### Manual Verification

- Log in and verify that the sidebar only shows "Inbox".
- Verify that system events (like "Lead Created") appear in the Inbox alongside standard email messages.
