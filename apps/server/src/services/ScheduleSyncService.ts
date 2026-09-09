import { randomUUID } from 'node:crypto'
import { db, type ScheduledGoal } from '@project/db'
import { readValues, listSheetTabs, batchUpdateValues, appendValues } from '../lib/crm/googleSheets'
import { ensureFreshToken } from './CrmOAuthService'

const LEASE_MS = 5 * 60 * 1000
const HEADER_ROW = [
  'Loopie ID',
  'Date',
  'Time',
  'Task',
  'Assignee',
  'Estimate',
  'Status',
  'Created By',
  'Actual Tracked Time',
]
const quoteTab = (tab: string) => `'${tab.replace(/'/g, "''")}'`
const messageOf = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error
    ? String(error.message).slice(0, 2000)
    : 'Sync failed'

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  DONE: 'Done',
  DISMISSED: 'Dismissed',
}

type TargetRow = {
  id: string
  integrationId: string
  spreadsheetId: string
  spreadsheetName: string
  sheetTab: string
  lastSyncAt: Date | null
  lastSyncError: string | null
  lockToken: string | null
  lockExpiresAt: Date | null
}

function targetDTO(target: TargetRow) {
  return {
    id: target.id,
    integrationId: target.integrationId,
    spreadsheetId: target.spreadsheetId,
    spreadsheetName: target.spreadsheetName,
    sheetTab: target.sheetTab,
    lastSyncAt: target.lastSyncAt?.toISOString() ?? null,
    lastSyncError: target.lastSyncError,
    syncing: Boolean(target.lockToken && target.lockExpiresAt && target.lockExpiresAt > new Date()),
  }
}

// One-way LOOPIE -> Google Sheets mirror of ScheduledGoal rows (2026-09-10). Deliberately the
// opposite direction from ImportSourceService, and deliberately never reads anything back except
// the Loopie ID column used purely to find *its own* rows again.
export class ScheduleSyncService {
  private async account(businessId: string, integrationId: string) {
    const account = await db.integration.findFirst({
      where: { id: integrationId, businessId, provider: 'GOOGLE_SHEETS' },
    })
    if (!account) throw { statusCode: 404, message: 'Google account not found' }
    return account
  }

  async get(businessId: string, integrationId: string) {
    await this.account(businessId, integrationId)
    const target = await db.scheduleSyncTarget.findUnique({ where: { integrationId } })
    return target ? targetDTO(target) : null
  }

  async create(
    businessId: string,
    integrationId: string,
    input: { spreadsheetId: string; sheetTab: string },
  ) {
    const account = await this.account(businessId, integrationId)
    const creds = await ensureFreshToken(account)
    const meta = await listSheetTabs(creds.accessToken, input.spreadsheetId)
    if (!meta.tabs.some((tab) => tab.title === input.sheetTab))
      throw { statusCode: 400, message: 'Select an existing worksheet tab' }

    const target = await db.scheduleSyncTarget.upsert({
      where: { integrationId },
      create: {
        integrationId,
        spreadsheetId: input.spreadsheetId,
        sheetTab: input.sheetTab,
        spreadsheetName: meta.spreadsheetTitle,
      },
      // Reconnecting (a different sheet/tab) resets sync history — the new destination has no
      // relationship yet to whatever the old one was mid-sync with.
      update: {
        spreadsheetId: input.spreadsheetId,
        sheetTab: input.sheetTab,
        spreadsheetName: meta.spreadsheetTitle,
        lastSyncAt: null,
        lastSyncError: null,
      },
    })
    return targetDTO(target)
  }

  async delete(businessId: string, integrationId: string) {
    await this.account(businessId, integrationId)
    await db.scheduleSyncTarget.deleteMany({ where: { integrationId } })
  }

  // The business-scoped entry point for the manual "Sync now" endpoint — validates the
  // integration actually belongs to the caller's business before running anything. sync() itself
  // takes only an integrationId with no such check, because worker.ts's poller legitimately
  // iterates every business's targets and already has no per-request tenant to scope against.
  async syncForBusiness(businessId: string, integrationId: string) {
    await this.account(businessId, integrationId)
    return this.sync(integrationId)
  }

  // The core sync. Reads the sheet's own "Loopie ID" column once to derive current row
  // positions (never a remembered row number — a manual reorder in the sheet can't corrupt a
  // future update), diffs every ScheduledGoal updated since the last successful sync against
  // it, and updates or appends accordingly. Deliberately a cheap no-op when nothing changed
  // (one column read + a lastSyncAt bump), so both syncForBusiness and worker.ts's poller can
  // call this unconditionally rather than pre-filtering.
  async sync(integrationId: string) {
    const target = await db.scheduleSyncTarget.findUnique({ where: { integrationId } })
    if (!target) throw { statusCode: 404, message: 'No connected sheet for this integration' }

    const lockToken = randomUUID()
    const acquired = await db.scheduleSyncTarget.updateMany({
      where: { integrationId, OR: [{ lockToken: null }, { lockExpiresAt: { lt: new Date() } }] },
      data: {
        lockToken,
        lockExpiresAt: new Date(Date.now() + LEASE_MS),
        lastSyncAttemptAt: new Date(),
      },
    })
    if (!acquired.count) throw { statusCode: 409, message: 'A sync is already running' }

    try {
      const account = await db.integration.findUniqueOrThrow({ where: { id: integrationId } })
      const businessId = account.businessId
      const creds = await ensureFreshToken(account)

      const meta = await listSheetTabs(creds.accessToken, target.spreadsheetId)
      const tab = meta.tabs.find((t) => t.title === target.sheetTab)
      if (!tab) throw { statusCode: 409, message: 'The connected worksheet tab no longer exists' }

      const idColumn = await readValues(
        creds.accessToken,
        target.spreadsheetId,
        `${quoteTab(target.sheetTab)}!A2:A${Math.max(tab.rowCount, 2)}`,
      )
      const rowByGoalId = new Map<string, number>()
      idColumn.forEach((row, index) => {
        if (row[0]) rowByGoalId.set(row[0], index + 2)
      })
      if (idColumn.length === 0) {
        await batchUpdateValues(creds.accessToken, target.spreadsheetId, [
          { range: `${quoteTab(target.sheetTab)}!A1:I1`, values: [HEADER_ROW] },
        ])
      }

      const goals = await db.scheduledGoal.findMany({
        where: target.lastSyncAt
          ? { businessId, updatedAt: { gt: target.lastSyncAt } }
          : { businessId },
      })

      if (goals.length > 0) {
        const userIds = [
          ...new Set(
            goals
              .flatMap((g) => [g.assignedToUserId, g.createdByUserId])
              .filter((id): id is string => !!id),
          ),
        ]
        const users = userIds.length
          ? await db.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, email: true },
            })
          : []
        const emailById = new Map(users.map((u) => [u.id, u.email]))

        const goalIds = goals.map((g) => g.id)
        const entries = await db.timeEntry.findMany({
          where: { scheduledGoalId: { in: goalIds }, endedAt: { not: null } },
          select: { scheduledGoalId: true, startedAt: true, endedAt: true },
        })
        const trackedMsByGoal = new Map<string, number>()
        for (const entry of entries) {
          if (!entry.scheduledGoalId || !entry.endedAt) continue
          const ms = entry.endedAt.getTime() - entry.startedAt.getTime()
          trackedMsByGoal.set(
            entry.scheduledGoalId,
            (trackedMsByGoal.get(entry.scheduledGoalId) ?? 0) + ms,
          )
        }

        const toRow = (goal: ScheduledGoal): (string | number)[] => [
          goal.id,
          goal.scheduledFor ? goal.scheduledFor.toISOString().slice(0, 10) : '',
          goal.scheduledFor && goal.hasTime ? goal.scheduledFor.toISOString().slice(11, 16) : '',
          goal.title,
          goal.assignedToUserId ? (emailById.get(goal.assignedToUserId) ?? '') : '',
          formatMinutes(goal.estimateMinutes ?? 0),
          STATUS_LABEL[goal.status] ?? goal.status,
          goal.createdByUserId ? (emailById.get(goal.createdByUserId) ?? '') : '',
          formatMinutes(Math.round((trackedMsByGoal.get(goal.id) ?? 0) / 60_000)),
        ]

        const updates: { range: string; values: (string | number)[][] }[] = []
        const appends: (string | number)[][] = []
        for (const goal of goals) {
          const rowNumber = rowByGoalId.get(goal.id)
          const row = toRow(goal)
          if (rowNumber) {
            updates.push({
              range: `${quoteTab(target.sheetTab)}!A${rowNumber}:I${rowNumber}`,
              values: [row],
            })
          } else {
            appends.push(row)
          }
        }

        await batchUpdateValues(creds.accessToken, target.spreadsheetId, updates)
        await appendValues(
          creds.accessToken,
          target.spreadsheetId,
          `${quoteTab(target.sheetTab)}!A1:I1`,
          appends,
        )
      }

      const updated = await db.scheduleSyncTarget.update({
        where: { integrationId },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      })
      return targetDTO(updated)
    } catch (error) {
      await db.scheduleSyncTarget.updateMany({
        where: { integrationId, lockToken },
        data: { lastSyncError: messageOf(error) },
      })
      throw error
    } finally {
      await db.scheduleSyncTarget.updateMany({
        where: { integrationId, lockToken },
        data: { lockToken: null, lockExpiresAt: null },
      })
    }
  }

  // worker.ts's poller — calls sync() for every connected target regardless of whether anything
  // actually changed (see sync()'s own comment on why that's cheap), one target's failure never
  // stopping the rest.
  async runDueSyncs() {
    const targets = await db.scheduleSyncTarget.findMany({ select: { integrationId: true } })
    let synced = 0
    let failed = 0
    for (const target of targets) {
      try {
        await this.sync(target.integrationId)
        synced++
      } catch {
        failed++
      }
    }
    return { total: targets.length, synced, failed }
  }
}

export async function runDueScheduleSyncs() {
  return new ScheduleSyncService().runDueSyncs()
}
