/**
 * Time Tracking & Team Activity epic — real browser + live server + live DB, covering Phases 1-3
 * together against the demo business (multiple real seeded teammates: demo@loopie.app founder,
 * shop@loopie.app / marketer@loopie.app members — see packages/db/prisma/seed/accounts.ts).
 *
 * Phase 1: assign a task to a teammate + set its estimate via the Assign & Estimate rail, and see
 * the assignee chip appear on the row. Phase 2: Start Work -> the rail -> Stop Work round trip in
 * the Calendar header, including the elapsed-time display. Phase 3: a SECOND real browser
 * context, logged in as a different teammate, starts a timer — proven visible in the first
 * context's Team Activity strip without any presence/online mechanism, and gone again once that
 * teammate stops.
 *
 * Seed credentials come from packages/db/prisma/seed/accounts.ts. Run seed before tests: pnpm db:seed
 */
import { test, expect, type Page } from '@playwright/test'
import { db } from '@project/db'

const PASSWORD = 'password123'

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/(home|calendar)/)
  await page.goto('/calendar')
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
}

// Defensive: an earlier interrupted run (this one or a concurrent session against the same
// shared demo account) can leave a real timer running. Clear it first so Start Work is always
// reachable, rather than asserting into someone else's leftover state.
async function ensureNotTracking(page: Page) {
  // The header renders the idle "Start Work" state immediately and only flips to "Stop Work"
  // once useCurrentTimeEntry's fetch resolves — give it a moment before deciding there's
  // nothing to clean up, so this doesn't race a real running entry into a false negative.
  await page.waitForTimeout(1500)
  const stopButton = page.getByRole('button', { name: /stop work/i })
  if (await stopButton.isVisible().catch(() => false)) {
    await stopButton.click()
    await expect(page.getByRole('button', { name: /start work/i })).toBeVisible()
  }
}

test.describe('Time Tracking & Team Activity', () => {
  test('Phase 1: assigning a task to a teammate and setting its estimate shows an assignee chip', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await loginAs(page, 'demo@loopie.app')

    const taskMarker = `E2E rail test ${Date.now()}`
    await page.getByPlaceholder('Add a task…').fill(taskMarker)
    await page.getByRole('button', { name: /add task/i }).click()
    const todaySection = page.locator('section', { hasText: 'Today' }).first()
    const titleButton = todaySection.getByText(taskMarker)
    await expect(titleButton).toBeVisible()
    // The row div is this title button's own parent (same flex row as the estimate/assignee
    // chips) — scoping to it, not the whole Today section, matters once the shared demo account
    // has accumulated other shop@loopie.app-assigned tasks from earlier runs.
    const row = titleButton.locator('..')

    // Expand the row, open the Assign & Estimate rail — never labeled "Edit task". Exact match:
    // a loose /assign/i would also match this row's own "Mark ... done" aria-label once the task
    // title itself contains that word, and the row's own title button.
    await titleButton.click()
    await todaySection.getByRole('button', { name: 'Assign', exact: true }).click()
    const rail = page.getByRole('dialog')
    await expect(rail.getByRole('heading', { name: 'Assign & Estimate' })).toBeVisible()

    await rail.locator('select').selectOption({ label: 'shop@loopie.app' })
    await rail.getByRole('button', { name: '1h', exact: true }).click()
    await rail.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(rail).toBeHidden()

    // Reassigning to a teammate (not the viewer) surfaces the initials chip on this row.
    await expect(row.locator('span[title="shop@loopie.app"]')).toBeVisible()
  })

  test('Phase 2: Start Work -> rail -> Stop Work round trip, with a live elapsed display', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await loginAs(page, 'demo@loopie.app')
    await ensureNotTracking(page)

    await page.getByRole('button', { name: /start work/i }).click()
    const rail = page.getByRole('dialog')
    await expect(rail.getByRole('heading', { name: 'Start Work' })).toBeVisible()

    const description = `E2E time entry ${Date.now()}`
    await rail.getByPlaceholder(/what are you working on/i).fill(description)
    await rail.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(rail).toBeHidden()

    // The header now shows Stop Work, the description, and an elapsed chip (starts at 0m) —
    // scoped to the control's own row, since other rows on the page have their own "30m"/"1h"
    // estimate chips that would otherwise collide with a page-wide text match.
    const stopButton = page.getByRole('button', { name: /stop work/i })
    await expect(stopButton).toBeVisible()
    const controlRow = stopButton.locator('..')
    await expect(controlRow.getByText(description)).toBeVisible()
    await expect(controlRow.getByText(/^\d+m$/)).toBeVisible()

    await page.getByRole('button', { name: /stop work/i }).click()
    await expect(page.getByRole('button', { name: /start work/i })).toBeVisible()
  })

  test("Phase 3: a teammate's real running timer shows up in Team Activity, and disappears once they stop", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000)
    await loginAs(page, 'demo@loopie.app')
    await ensureNotTracking(page)

    const teammateContext = await browser.newContext()
    const teammatePage = await teammateContext.newPage()
    await loginAs(teammatePage, 'shop@loopie.app')
    await ensureNotTracking(teammatePage)

    const description = `Prepping the Acme shoot ${Date.now()}`
    await teammatePage.getByRole('button', { name: /start work/i }).click()
    const teammateRail = teammatePage.getByRole('dialog')
    await teammateRail.getByPlaceholder(/what are you working on/i).fill(description)
    await teammateRail.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(teammateRail).toBeHidden()
    await expect(teammatePage.getByRole('button', { name: /stop work/i })).toBeVisible()

    // Back on demo's own page — reload to pick up the teammate's now-running entry. No presence
    // mechanism exists; this is purely a read of real TimeEntry rows.
    await page.reload()
    const teamSection = page.locator('div', { hasText: 'Team activity' }).first()
    await expect(teamSection.getByText(/^shop —/)).toBeVisible()
    await expect(teamSection.getByText(description, { exact: false })).toBeVisible()

    await teammatePage.getByRole('button', { name: /stop work/i }).click()
    await expect(teammatePage.getByRole('button', { name: /start work/i })).toBeVisible()

    await page.reload()
    const teamSectionAfter = page.locator('div', { hasText: 'Team activity' }).first()
    await expect(teamSectionAfter.getByText('shop — Not tracking')).toBeVisible()

    await teammateContext.close()
  })

  // Phase 4 hardening (2026-09-09).

  test('Phase 4: elapsed time is correct immediately on page load from a real stale startedAt, not stuck at 0m', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await loginAs(page, 'demo@loopie.app')
    await ensureNotTracking(page)

    const user = await db.user.findUniqueOrThrow({ where: { email: 'demo@loopie.app' } })
    await db.timeEntry.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        description: 'Already running before this page load',
        startedAt: new Date(Date.now() - 47 * 60 * 1000),
        runningForUserId: user.id,
      },
    })

    // A fresh load (not started from this page) still has to compute the right elapsed time on
    // mount — this is the general case an interval alone wouldn't cover, since nothing here ever
    // ran a 0m -> 47m countdown; it has to be correct from the very first render.
    await page.reload()
    const stopButton = page.getByRole('button', { name: /stop work/i })
    await expect(stopButton).toBeVisible()
    const controlRow = stopButton.locator('..')
    await expect(controlRow.getByText(/^47m$/)).toBeVisible()

    await stopButton.click()
    await expect(page.getByRole('button', { name: /start work/i })).toBeVisible()
  })

  test('Phase 4: an 8+ hour running entry offers Stop now / Set end time instead of stopping silently', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await loginAs(page, 'demo@loopie.app')
    await ensureNotTracking(page)

    const user = await db.user.findUniqueOrThrow({ where: { email: 'demo@loopie.app' } })
    await db.timeEntry.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        description: 'Left running overnight',
        startedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
        runningForUserId: user.id,
      },
    })

    await page.reload()
    const stopButton = page.getByRole('button', { name: /stop work/i })
    await expect(stopButton).toBeVisible()
    await stopButton.click()

    // Never a silent stop past the threshold — the correction rail, not an immediate stop.
    const rail = page.getByRole('dialog')
    await expect(rail.getByRole('heading', { name: 'Still running?' })).toBeVisible()
    await expect(page.getByRole('button', { name: /start work/i })).toHaveCount(0)

    await rail.getByRole('button', { name: 'Stop now', exact: true }).click()
    await expect(rail).toBeHidden()
    await expect(page.getByRole('button', { name: /start work/i })).toBeVisible()
  })

  test('Phase 4: current-entry state survives a page refresh (server, not component state, is the source of truth)', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await loginAs(page, 'demo@loopie.app')
    await ensureNotTracking(page)

    await page.getByRole('button', { name: /start work/i }).click()
    const rail = page.getByRole('dialog')
    await rail.getByPlaceholder(/what are you working on/i).fill('Refresh survival test')
    await rail.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(rail).toBeHidden()

    await expect(page.getByRole('button', { name: /stop work/i })).toBeVisible()

    // A plain refresh must not lose the running state — GET /time-entries/current on mount is
    // the source of truth, not any client-side state that a reload would otherwise wipe.
    // (react-query's own refetchOnWindowFocus default would additionally pick up a correction
    // made from another tab, but headless Chromium's multi-tab visibility semantics don't
    // reliably reproduce real browser focus/blur for an e2e proof of that framework default —
    // the mount-time fetch this test exercises is this epic's own code, not react-query's.)
    await page.reload()
    await expect(page.getByRole('button', { name: /stop work/i })).toBeVisible()

    await page.getByRole('button', { name: /stop work/i }).click()
    await expect(page.getByRole('button', { name: /start work/i })).toBeVisible()
  })
})
