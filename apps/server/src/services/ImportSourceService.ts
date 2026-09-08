import { createHash, randomUUID } from 'node:crypto'
import { db, type ImportSource, type ImportJob } from '@project/db'
import { createImportMatrix } from '../../../../packages/sdk/src/lib/importMatrix'
import { normalizeImportContact } from '../../../../packages/sdk/src/lib/importContactSchema'
import { readValues, listSheetTabs, type GoogleColumnMapping } from '../lib/crm/googleSheets'
import { ensureFreshToken } from './CrmOAuthService'
import { suggestMapping, validateMapping } from './GoogleSheetsService'
import { resolveContact } from '../lib/identityResolution'
import { integrationScope } from '../lib/crm/catalog'

const PREVIEW_LIMIT = 5000
const PAGE_SIZE = 250
const MAX_PAGES = 8
const LEASE_MS = 15 * 60 * 1000
const quoteTab = (tab: string) => `'${tab.replace(/'/g, "''")}'`
export const fingerprintHeaders = (headers: string[]) =>
  createHash('sha256').update(JSON.stringify(headers)).digest('hex')
const messageOf = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error
    ? String(error.message).slice(0, 2000)
    : 'Import failed'

function mappedContact(row: string[], mapping: GoogleColumnMapping) {
  return normalizeImportContact(
    Object.fromEntries(Object.entries(mapping).map(([key, index]) => [key, row[index] ?? ''])),
  )
}

function sourceDTO(source: ImportSource) {
  return {
    id: source.id,
    integrationId: source.integrationId,
    label: source.label,
    spreadsheetId: source.spreadsheetId,
    spreadsheetName: source.spreadsheetName,
    sheetTab: source.sheetTab,
    mapping: source.mapping as GoogleColumnMapping | null,
    schemaFingerprint: source.schemaFingerprint,
    needsReview: source.needsReview,
    refreshPolicy: 'MANUAL' as const,
    cursor: source.cursor,
    hasMore: source.hasMore,
    lastRunAt: source.lastRunAt?.toISOString() ?? null,
    lastError: source.lastError,
    previewRowCount: source.previewRowCount,
    previewEligibleCount: source.previewEligibleCount,
    previewTruncated: source.previewTruncated,
    running: Boolean(source.lockToken && source.lockExpiresAt && source.lockExpiresAt > new Date()),
  }
}
function runDTO(run: ImportJob) {
  return {
    id: run.id,
    sourceId: run.sourceId,
    status: run.status,
    scanned: run.scanned,
    eligible: run.eligible,
    matched: run.matched,
    created: run.created,
    updated: run.updatedContacts,
    skipped: run.skipped,
    failed: run.failed,
    error: run.error,
    hasMore: run.hasMore,
    startCursor: run.startCursor,
    endCursor: run.endCursor,
    schemaFingerprint: run.schemaFingerprint,
    startedAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  }
}

export class ImportSourceService {
  private async account(businessId: string, integrationId: string) {
    const account = await db.integration.findFirst({
      where: { id: integrationId, businessId, provider: 'GOOGLE_SHEETS' },
    })
    if (!account) throw { statusCode: 404, message: 'Google account not found' }
    return account
  }
  private async requireSource(businessId: string, integrationId: string, sourceId: string) {
    const account = await this.account(businessId, integrationId)
    const source = await db.importSource.findFirst({ where: { id: sourceId, integrationId } })
    if (!source) throw { statusCode: 404, message: 'Source not found' }
    return { account, source }
  }
  async list(businessId: string, integrationId: string) {
    await this.account(businessId, integrationId)
    return (
      await db.importSource.findMany({ where: { integrationId }, orderBy: { createdAt: 'desc' } })
    ).map(sourceDTO)
  }
  async tabs(businessId: string, integrationId: string, spreadsheetId: string) {
    const account = await this.account(businessId, integrationId)
    const creds = await ensureFreshToken(account)
    return (await listSheetTabs(creds.accessToken, spreadsheetId)).tabs
  }
  async create(
    businessId: string,
    integrationId: string,
    input: { spreadsheetId: string; sheetTab: string; label?: string },
  ) {
    const account = await this.account(businessId, integrationId)
    const creds = await ensureFreshToken(account)
    const meta = await listSheetTabs(creds.accessToken, input.spreadsheetId)
    if (!meta.tabs.some((tab) => tab.title === input.sheetTab))
      throw { statusCode: 400, message: 'Select an existing worksheet tab' }
    return sourceDTO(
      await db.importSource.upsert({
        where: {
          integrationId_spreadsheetId_sheetTab: {
            integrationId,
            spreadsheetId: input.spreadsheetId,
            sheetTab: input.sheetTab,
          },
        },
        create: {
          integrationId,
          spreadsheetId: input.spreadsheetId,
          sheetTab: input.sheetTab,
          spreadsheetName: meta.spreadsheetTitle,
          label: input.label?.trim() || `${meta.spreadsheetTitle} / ${input.sheetTab}`,
        },
        update: {},
      }),
    )
  }
  async get(businessId: string, integrationId: string, sourceId: string) {
    return sourceDTO((await this.requireSource(businessId, integrationId, sourceId)).source)
  }
  async preview(
    businessId: string,
    integrationId: string,
    sourceId: string,
    mappingOverride?: GoogleColumnMapping,
  ) {
    const { account, source } = await this.requireSource(businessId, integrationId, sourceId)
    const creds = await ensureFreshToken(account)
    const meta = await listSheetTabs(creds.accessToken, source.spreadsheetId)
    const tab = meta.tabs.find((tab) => tab.title === source.sheetTab)
    if (!tab) {
      await db.importSource.update({ where: { id: source.id }, data: { needsReview: true } })
      throw {
        statusCode: 409,
        message: 'The saved worksheet no longer exists. Save a new source for its replacement.',
      }
    }
    const rows = await readValues(
      creds.accessToken,
      source.spreadsheetId,
      `${quoteTab(source.sheetTab)}!1:${Math.min(tab.rowCount, PREVIEW_LIMIT + 2)}`,
    )
    const fingerprint = fingerprintHeaders(rows[0] ?? [])
    const drift = Boolean(source.schemaFingerprint && source.schemaFingerprint !== fingerprint)
    const matrix = createImportMatrix(
      rows.slice(0, PREVIEW_LIMIT + 1),
      tab.rowCount > PREVIEW_LIMIT + 1,
    )
    const mapping =
      mappingOverride ??
      (source.mapping && !drift
        ? (source.mapping as GoogleColumnMapping)
        : suggestMapping(matrix.headers))
    validateMapping(mapping, matrix.headers.length)
    let eligible = 0
    for (const row of matrix.rows) {
      const contact = mappedContact(row, mapping)
      if (contact.email || contact.phone || contact.externalId) eligible++
    }
    await db.importSource.update({
      where: { id: source.id },
      data: {
        ...(drift ? { needsReview: true } : {}),
        previewRowCount: matrix.rows.length,
        previewEligibleCount: eligible,
        previewTruncated: matrix.truncated,
      },
    })
    return {
      matrix: { ...matrix, rows: matrix.rows.slice(0, 8) },
      mapping,
      schemaFingerprint: fingerprint,
      schemaDrift: drift,
      needsReview: source.needsReview || drift,
      scanned: matrix.rows.length,
      eligible,
      skipped: matrix.rows.length - eligible,
    }
  }
  async confirm(
    businessId: string,
    integrationId: string,
    sourceId: string,
    input: { mapping: GoogleColumnMapping; schemaFingerprint: string },
  ) {
    if (
      input.mapping.email === undefined &&
      input.mapping.phone === undefined &&
      input.mapping.externalId === undefined
    )
      throw { statusCode: 400, message: 'Map an email, phone, or external ID column' }
    const preview = await this.preview(businessId, integrationId, sourceId, input.mapping)
    if (preview.schemaFingerprint !== input.schemaFingerprint)
      throw {
        statusCode: 409,
        message:
          'Headings changed during review. Refresh the preview and review the mapping again.',
      }
    const changed = await db.importSource.updateMany({
      where: {
        id: sourceId,
        integrationId,
        OR: [{ lockToken: null }, { lockExpiresAt: { lt: new Date() } }],
      },
      data: {
        mapping: input.mapping,
        schemaFingerprint: preview.schemaFingerprint,
        headers: preview.matrix.headers,
        needsReview: false,
        cursor: null,
        hasMore: false,
        lastError: null,
      },
    })
    if (!changed.count)
      throw {
        statusCode: 409,
        message: 'Wait for the current import to finish before changing its mapping',
      }
    return this.get(businessId, integrationId, sourceId)
  }
  async history(businessId: string, integrationId: string, sourceId: string, before?: string) {
    await this.requireSource(businessId, integrationId, sourceId)
    const cursor = before
      ? await db.importJob.findFirst({ where: { id: before, sourceId, businessId } })
      : null
    if (before && !cursor) throw { statusCode: 400, message: 'Invalid history cursor' }
    const rows = await db.importJob.findMany({
      where: {
        sourceId,
        businessId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 21,
    })
    return {
      runs: rows.slice(0, 20).map(runDTO),
      nextCursor: rows.length > 20 ? rows[19]!.id : null,
    }
  }
  async sync(businessId: string, integrationId: string, sourceId: string) {
    const { account } = await this.requireSource(businessId, integrationId, sourceId)
    if (account.status !== 'CONNECTED')
      throw { statusCode: 409, message: 'Connect this Google account before importing' }
    const lockToken = randomUUID()
    const acquired = await db.importSource.updateMany({
      where: {
        id: sourceId,
        integrationId,
        OR: [{ lockToken: null }, { lockExpiresAt: { lt: new Date() } }],
      },
      data: { lockToken, lockExpiresAt: new Date(Date.now() + LEASE_MS) },
    })
    if (!acquired.count) throw { statusCode: 409, message: 'This source is already importing' }
    let job: ImportJob | undefined
    try {
      const source = await db.importSource.findUniqueOrThrow({ where: { id: sourceId } })
      // Recover history for a process that died without reaching its finally block.
      await db.importJob.updateMany({
        where: { sourceId, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: 'Import interrupted. Resume from the last committed checkpoint.',
        },
      })
      job = await db.importJob.create({
        data: {
          businessId,
          integrationId,
          sourceId,
          status: 'RUNNING',
          startCursor: source.cursor,
          endCursor: source.cursor,
          schemaFingerprint: source.schemaFingerprint,
          mappingSnapshot: source.mapping ?? undefined,
        },
      })
      if (source.needsReview || !source.mapping || !source.schemaFingerprint)
        throw {
          statusCode: 409,
          message: 'Review and confirm this source mapping before importing',
        }
      const creds = await ensureFreshToken(account)
      const meta = await listSheetTabs(creds.accessToken, source.spreadsheetId)
      const tab = meta.tabs.find((tab) => tab.title === source.sheetTab)
      if (!tab) {
        await db.importSource.updateMany({
          where: { id: sourceId, lockToken },
          data: { needsReview: true },
        })
        throw {
          statusCode: 409,
          message: 'The saved worksheet no longer exists. Choose a new source.',
        }
      }
      const mapping = source.mapping as GoogleColumnMapping
      let start = source.cursor ? Number(source.cursor) : 2
      let hasMore = false
      for (let page = 0; page < MAX_PAGES; page++) {
        const headers =
          (
            await readValues(
              creds.accessToken,
              source.spreadsheetId,
              `${quoteTab(source.sheetTab)}!1:1`,
            )
          )[0] ?? []
        if (fingerprintHeaders(headers) !== source.schemaFingerprint) {
          await db.importSource.updateMany({
            where: { id: sourceId, lockToken },
            data: { needsReview: true },
          })
          throw {
            statusCode: 409,
            message: 'Spreadsheet headings changed. Review the mapping before continuing.',
          }
        }
        const end = Math.min(start + PAGE_SIZE - 1, tab.rowCount)
        const rows =
          start <= end
            ? await readValues(
                creds.accessToken,
                source.spreadsheetId,
                `${quoteTab(source.sheetTab)}!${start}:${end}`,
              )
            : []
        hasMore = end < tab.rowCount
        const nextCursor = hasMore ? String(end + 1) : null
        const runId = job.id
        await db.$transaction(
          async (tx) => {
            // Fence expired workers and serialize checkpoint + contacts + counters in one commit.
            const lease = await tx.importSource.updateMany({
              where: { id: sourceId, lockToken, lockExpiresAt: { gt: new Date() } },
              data: { lockExpiresAt: new Date(Date.now() + LEASE_MS) },
            })
            if (!lease.count)
              throw { statusCode: 409, message: 'Import lease expired; resume from its checkpoint' }
            const counts = {
              scanned: rows.length,
              eligible: 0,
              matched: 0,
              created: 0,
              updatedContacts: 0,
              skipped: 0,
              failed: 0,
            }
            for (const [index, row] of rows.entries()) {
              const contact = mappedContact(row, mapping)
              if (!contact.email && !contact.phone && !contact.externalId) {
                counts.skipped++
                continue
              }
              counts.eligible++
              const externalId = `sheet_${createHash('sha256')
                .update(
                  JSON.stringify([
                    source.spreadsheetId,
                    source.sheetTab,
                    contact.externalId ? 'id' : contact.email ? 'email' : 'phone',
                    contact.externalId ?? contact.email?.toLowerCase() ?? contact.phone,
                  ]),
                )
                .digest('hex')}`
              const result = await resolveContact(
                tx,
                businessId,
                {
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                  company: contact.company,
                  source: 'GOOGLE_SHEETS',
                },
                {
                  provider: 'GOOGLE_SHEETS',
                  externalId,
                  scopeKey: integrationScope(integrationId),
                  integrationId,
                  importJobId: runId,
                  sourceSnapshot: {
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                    company: contact.company,
                  },
                  raw: { sourceId, row: start + index, profile: contact.profile ?? {} },
                },
              )
              if (result.status === 'ambiguous') counts.failed++
              else if (result.created) counts.created++
              else {
                counts.matched++
                if (result.updated) counts.updatedContacts++
              }
            }
            await tx.importJob.update({
              where: { id: runId },
              data: {
                ...Object.fromEntries(
                  Object.entries(counts).map(([key, value]) => [key, { increment: value }]),
                ),
                endCursor: nextCursor,
                hasMore,
              },
            })
            await tx.importSource.update({
              where: { id: sourceId },
              data: { cursor: nextCursor, hasMore },
            })
          },
          { timeout: 60_000 },
        )
        start = end + 1
        if (!hasMore) break
      }
      const completed = await db.importJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date(), hasMore },
      })
      await db.importSource.updateMany({
        where: { id: sourceId, lockToken },
        data: { lastRunAt: new Date(), lastError: null },
      })
      return runDTO(completed)
    } catch (error) {
      if (job)
        await db.importJob.updateMany({
          where: { id: job.id, status: 'RUNNING' },
          data: { status: 'FAILED', completedAt: new Date(), error: messageOf(error) },
        })
      await db.importSource.updateMany({
        where: { id: sourceId, lockToken },
        data: { lastRunAt: new Date(), lastError: messageOf(error) },
      })
      throw error
    } finally {
      await db.importSource.updateMany({
        where: { id: sourceId, lockToken },
        data: { lockToken: null, lockExpiresAt: null },
      })
    }
  }
}
