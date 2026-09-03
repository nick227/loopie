/**
 * Calendar — real browser + live server + live DB. Covers: List view's idea lifecycle (expand
 * inline, no action while still an idea, single-click schedule, the action button living inside
 * the expanded panel next to Mark done/Reschedule rather than always-visible, Recently Completed
 * keeps done work visible); the top persistent "Add a task" input committing straight to today;
 * and the Calendar view's Month grid (the default) with Year as its lightweight overview mode,
 * plus its own Upcoming/Recently Completed/Ideas lists and day-level quick-add.
 *
 * Seed credentials come from packages/db/prisma/seed.ts. Run seed before tests: pnpm db:seed
 */
import { test, expect, type Page } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/(home|calendar)/)
}

test.describe('Calendar', () => {
  test('List: Add a task commits to today; an idea expands inline with no action; scheduling and completing keep the action button inside the expanded panel', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await loginAs(page)

    await page.getByRole('link', { name: 'Calendar' }).click()
    await page.waitForURL(/\/calendar/)
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()

    // --- The top persistent input is "Add a task…" and commits straight to Today ---
    const taskMarker = `E2E task ${Date.now()}`
    await page.getByPlaceholder('Add a task…').fill(taskMarker)
    await page.getByRole('button', { name: /add task/i }).click()
    const todaySection = page.locator('section', { hasText: 'Today' }).first()
    await expect(todaySection.getByText(taskMarker)).toBeVisible()

    // --- The persistent Ideas section has its own "+ Add idea" (create-only, no schedule) ---
    const ideasSection = page.locator('section', { hasText: 'Ideas' }).first()
    await expect(ideasSection.getByRole('button', { name: /add idea/i })).toBeVisible()

    // --- The seeded CRM follow-up's action button lives inside the expanded panel, not always visible ---
    await expect(page.getByRole('button', { name: 'Open contact', exact: true })).toHaveCount(0)
    await page.getByText('Follow up with Jane Smith').click()
    await expect(page.getByRole('button', { name: 'Open contact', exact: true })).toBeVisible()
    await page.getByText('Follow up with Jane Smith').click() // collapse

    // --- An idea has no action link at all, and expands inline (no modal) on click ---
    // "Create your first audience" is one of the Foundation-tier ideas that reliably occupies a
    // top-6 slot for the demo account under the current MAX_IDEAS=6 cap (see CLAUDE.md's
    // 2026-09-02 "big real goals" revision) — unlike a low-priority idea such as "Ask 3 customers
    // for reviews", which the cap now regularly crowds out.
    const ideaTitle = 'Create your first audience'
    const ideaRow = page.locator('div', { hasText: ideaTitle }).last()
    await expect(ideaRow.getByRole('button', { name: /^open/i })).toHaveCount(0)
    await ideaRow.getByText(ideaTitle).click()
    await expect(page.getByText(/Why it matters:/)).toBeVisible()
    await expect(page.getByText(/Estimate:/)).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // --- Single-click schedule (no popup) ---
    await ideaRow.getByRole('button', { name: 'Schedule' }).click()
    const weekSection = page.locator('section', { hasText: 'This week' }).first()
    await expect(weekSection.getByText(ideaTitle)).toBeVisible()

    // --- Complete it: moves out of This Week, stays visible under Recently Completed ---
    const scheduledRow = weekSection.locator('div', { hasText: ideaTitle }).last()
    await scheduledRow.getByRole('button', { name: /Mark ".*" done/ }).click()
    await expect(weekSection.getByText(ideaTitle)).toHaveCount(0)
    const completedSection = page.locator('section', { hasText: 'Recently completed' }).first()
    await expect(completedSection.getByText(ideaTitle).first()).toBeVisible()
  })

  test('Calendar: Month is the default with Year as the lightweight overview, day quick-add works, and its own Upcoming/Recently Completed/Ideas lists render', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await loginAs(page)

    await page.getByRole('link', { name: 'Calendar' }).click()
    await page.waitForURL(/\/calendar/)
    await page.getByRole('button', { name: 'calendar view' }).click()

    // Month is the default mode; Week no longer exists, Year does.
    await expect(page.getByRole('button', { name: 'month mode' })).toHaveClass(/bg-foreground/)
    await expect(page.getByRole('button', { name: 'week mode' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'year mode' })).toBeVisible()
    await expect(
      page.getByText(
        /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/,
      ),
    ).toBeVisible()
    await expect(page.getByText('Mon', { exact: true })).toBeVisible()

    // No idea-chip rail in the grid area — ideas live in the persistent section below instead.
    await expect(page.getByText(/drop one onto a day/i)).toHaveCount(0)

    // Calendar's own lists: Upcoming, Recently Completed, and a persistent Ideas section.
    await expect(page.locator('section', { hasText: 'Upcoming' })).toBeVisible()
    await expect(page.locator('section', { hasText: 'Recently completed' })).toBeVisible()
    const calendarIdeasSection = page.locator('section', { hasText: 'Ideas' }).last()
    await expect(calendarIdeasSection.getByRole('button', { name: /add idea/i })).toBeVisible()

    // A seeded item renders both in its real day cell (compact, display-only) and as a full row
    // in the Upcoming list below — the day cell is what opens the detail panel with quick-add.
    const upcomingSection = page.locator('section', { hasText: 'Upcoming' }).first()
    await expect(
      upcomingSection.getByRole('button', { name: 'Work on your logo for an hour', exact: true }),
    ).toBeVisible()
    const monthGrid = page.locator('div.grid-cols-7').first()
    await monthGrid.getByText('Work on your logo for an hour').click()
    await expect(page.getByPlaceholder('+ Add')).toBeVisible()
    const marker = `E2E month add ${Date.now()}`
    await page.getByPlaceholder('+ Add').fill(marker)
    await page.getByPlaceholder('+ Add').press('Enter')
    await expect(page.getByRole('button', { name: marker, exact: true })).toBeVisible()

    // Navigate to next month and back via Today.
    const label = await page.locator('p.text-sm.font-medium').first().textContent()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.locator('p.text-sm.font-medium').first()).not.toHaveText(label ?? '')
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(page.locator('p.text-sm.font-medium').first()).toHaveText(label ?? '')

    // Year mode: lightweight counts only, click a month to jump into Month mode there.
    await page.getByRole('button', { name: 'year mode' }).click()
    await expect(page.getByText(new RegExp(`^${new Date().getFullYear()}$`))).toBeVisible()
    const monthName = new Date().toLocaleDateString(undefined, { month: 'long' })
    await page.getByRole('button', { name: new RegExp(`^${monthName}`) }).click()
    await expect(page.getByRole('button', { name: 'month mode' })).toHaveClass(/bg-foreground/)
  })
})
