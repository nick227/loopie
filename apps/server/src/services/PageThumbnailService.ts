import crypto from 'crypto'
import {
  db,
  PAGE_THEME_PRESETS,
  SYSTEM_TEMPLATE_STARTER_CONTENT,
  starterContentForTemplate,
  themeFromPreset,
} from '@project/db'
import type { Prisma } from '@prisma/client'
import { renderLandingPageHtml, snapshotForm } from '@project/page-renderer'
import { saveThumbnailFile } from '../lib/mediaStorage'
import { openCaptureSession, type CapturePageThumbnail } from '../lib/pageThumbnailCapture'
import { withResolvedMedia } from '../lib/pageMedia'
import { landingPageSubmitUrl } from '../lib/urls'
import { ensureSystemTemplates } from '../lib/ensureSystemTemplates'

const EMPTY_FORM = {
  id: 'thumbnail-form',
  submitLabel: 'Submit',
  successMessage: 'Thanks',
  fields: [] as never[],
}

/** Re-enqueue FAILED thumbs on list only after this window — avoids hammering a broken capturer. */
export const FAILED_THUMBNAIL_RETRY_MS = 5 * 60_000

export function systemLayoutKey(templateId: string, themePresetId: string) {
  return `${templateId}:${themePresetId}`
}

function checksumOf(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function systemStarterContent(template: { id: string; name: string; schema: unknown }) {
  return (
    SYSTEM_TEMPLATE_STARTER_CONTENT[template.id] ??
    starterContentForTemplate(template.schema as never, template.name)
  )
}

export type ThumbnailDtoFields = {
  thumbnailUrl: string | null
  thumbnailStatus: 'NONE' | 'PENDING' | 'READY' | 'STALE' | 'FAILED'
  thumbnailChecksum: string | null
  thumbnailSourceVersionId: string | null
}

export type ThumbRow = {
  url: string | null
  status: 'PENDING' | 'READY' | 'FAILED'
  sourceChecksum: string
  publishedVersionId: string | null
  updatedAt: Date
}

export function resolveThumbnailFields(
  publishedVersionId: string | null,
  publishedChecksum: string | null,
  thumb: Omit<ThumbRow, 'updatedAt'> | null | undefined,
): ThumbnailDtoFields {
  if (!publishedVersionId || !publishedChecksum) {
    return {
      thumbnailUrl: null,
      thumbnailStatus: 'NONE',
      thumbnailChecksum: null,
      thumbnailSourceVersionId: null,
    }
  }
  if (!thumb) {
    return {
      thumbnailUrl: null,
      thumbnailStatus: 'PENDING',
      thumbnailChecksum: publishedChecksum,
      thumbnailSourceVersionId: publishedVersionId,
    }
  }
  if (thumb.status === 'PENDING') {
    return {
      thumbnailUrl: null,
      thumbnailStatus: 'PENDING',
      thumbnailChecksum: thumb.sourceChecksum,
      thumbnailSourceVersionId: publishedVersionId,
    }
  }
  if (thumb.status === 'FAILED') {
    return {
      thumbnailUrl: null,
      thumbnailStatus: 'FAILED',
      thumbnailChecksum: thumb.sourceChecksum,
      thumbnailSourceVersionId: publishedVersionId,
    }
  }
  if (thumb.sourceChecksum !== publishedChecksum) {
    return {
      thumbnailUrl: null,
      thumbnailStatus: 'STALE',
      thumbnailChecksum: thumb.sourceChecksum,
      thumbnailSourceVersionId: publishedVersionId,
    }
  }
  return {
    thumbnailUrl: thumb.url,
    thumbnailStatus: 'READY',
    thumbnailChecksum: thumb.sourceChecksum,
    thumbnailSourceVersionId: publishedVersionId,
  }
}

export function shouldEnqueueThumbnailRepair(
  publishedVersionId: string | null,
  publishedChecksum: string | null,
  thumb: ThumbRow | null | undefined,
  now = new Date(),
  failedRetryMs = FAILED_THUMBNAIL_RETRY_MS,
): boolean {
  if (!publishedVersionId || !publishedChecksum) return false
  const fields = resolveThumbnailFields(publishedVersionId, publishedChecksum, thumb)
  if (fields.thumbnailStatus === 'STALE') return true
  if (fields.thumbnailStatus === 'PENDING' && !thumb) return true
  if (
    fields.thumbnailStatus === 'FAILED' &&
    thumb &&
    now.getTime() - thumb.updatedAt.getTime() >= failedRetryMs
  ) {
    return true
  }
  return false
}

export class PageThumbnailService {
  async enqueuePublishedVersion(publishedVersionId: string, sourceChecksum: string) {
    return db.pageThumbnail.upsert({
      where: { publishedVersionId },
      create: {
        kind: 'PUBLISHED_VERSION',
        publishedVersionId,
        sourceChecksum,
        status: 'PENDING',
        url: null,
        lastError: null,
      },
      update: {
        sourceChecksum,
        status: 'PENDING',
        url: null,
        lastError: null,
        widthPx: null,
        heightPx: null,
      },
    })
  }

  async enqueueSystemLayout(systemKey: string, sourceChecksum: string) {
    return db.pageThumbnail.upsert({
      where: { systemKey },
      create: {
        kind: 'SYSTEM_LAYOUT',
        systemKey,
        sourceChecksum,
        status: 'PENDING',
        url: null,
        lastError: null,
      },
      update: {
        sourceChecksum,
        status: 'PENDING',
        url: null,
        lastError: null,
        widthPx: null,
        heightPx: null,
      },
    })
  }

  async refreshForLandingPage(businessId: string, landingPageId: string) {
    const page = await db.landingPage.findFirst({
      where: { id: landingPageId, businessId, deletedAt: null },
      include: { publishedVersion: true },
    })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    if (!page.publishedVersionId || !page.publishedVersion) {
      throw { statusCode: 400, message: 'Page must be published before refreshing its thumbnail' }
    }
    const checksum = page.publishedVersion.checksum
    if (!checksum) throw { statusCode: 400, message: 'Published version has no checksum' }
    await this.enqueuePublishedVersion(page.publishedVersionId, checksum)
    return {
      thumbnailStatus: 'PENDING' as const,
      thumbnailSourceVersionId: page.publishedVersionId,
      thumbnailChecksum: checksum,
    }
  }

  async processPending(limit = 5) {
    const pending = await db.pageThumbnail.findMany({
      where: { status: 'PENDING' },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    })
    if (pending.length === 0) return 0

    const session = await openCaptureSession()
    try {
      for (const row of pending) {
        await this.processOne(row.id, session.capture)
      }
    } finally {
      await session.close()
    }
    return pending.length
  }

  async processOne(thumbnailId: string, capture: CapturePageThumbnail) {
    const row = await db.pageThumbnail.findUnique({ where: { id: thumbnailId } })
    if (!row || row.status !== 'PENDING') return

    // Superseded publish: drop the job so an older capture can never become the live preview.
    // Each version has its own row, but we still refuse to spend work / mark READY on non-current.
    if (row.kind === 'PUBLISHED_VERSION' && row.publishedVersionId) {
      const stillCurrent = await db.landingPage.findFirst({
        where: { publishedVersionId: row.publishedVersionId },
        select: { id: true },
      })
      if (!stillCurrent) {
        await db.pageThumbnail.delete({ where: { id: row.id } })
        return
      }
    }

    const expectedChecksum = row.sourceChecksum
    try {
      const html = await this.htmlForRow(row)
      const shot = await capture(html)
      const saved = await saveThumbnailFile({
        sourceChecksum: expectedChecksum,
        buffer: shot.buffer,
      })
      // Only commit if this row is still the same PENDING job (checksum unchanged).
      // Covers: mid-flight re-enqueue / regen, and any same-row race.
      const committed = await db.pageThumbnail.updateMany({
        where: {
          id: row.id,
          status: 'PENDING',
          sourceChecksum: expectedChecksum,
        },
        data: {
          status: 'READY',
          url: saved.url,
          widthPx: shot.widthPx,
          heightPx: shot.heightPx,
          lastError: null,
        },
      })
      if (committed.count === 0) return
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db.pageThumbnail.updateMany({
        where: {
          id: row.id,
          status: 'PENDING',
          sourceChecksum: expectedChecksum,
        },
        data: { status: 'FAILED', lastError: message.slice(0, 2000) },
      })
    }
  }

  private async htmlForRow(row: {
    kind: string
    publishedVersionId: string | null
    systemKey: string | null
  }) {
    if (row.kind === 'PUBLISHED_VERSION' && row.publishedVersionId) {
      return this.htmlForPublishedVersion(row.publishedVersionId)
    }
    if (row.kind === 'SYSTEM_LAYOUT' && row.systemKey) {
      return this.htmlForSystemLayout(row.systemKey)
    }
    throw new Error(`Unsupported thumbnail kind ${row.kind}`)
  }

  private async htmlForPublishedVersion(publishedVersionId: string) {
    const version = await db.publishedPageVersion.findUniqueOrThrow({
      where: { id: publishedVersionId },
      include: { landingPage: true },
    })
    const templateSchema =
      (version.schemaSnapshot as Prisma.JsonValue) ??
      (
        await db.landingPageTemplate.findUniqueOrThrow({
          where: { id: version.landingPage.templateId },
        })
      ).schema
    const form = version.formSnapshot
      ? (version.formSnapshot as {
          id: string
          submitLabel: string
          successMessage: string
          fields: never[]
        })
      : await snapshotForm(db, version.formId)
    const content = await withResolvedMedia(version.landingPage.businessId, version.content)
    return renderLandingPageHtml({
      pageName: version.landingPage.name,
      templateSchema: templateSchema as never,
      content,
      theme: (version.theme ?? {}) as never,
      layoutConfig: (version.layoutConfig ?? null) as never,
      form: form ?? EMPTY_FORM,
      submitActionUrl: landingPageSubmitUrl(version.landingPageId),
      publishedVersionId: version.id,
      adSlots: (version.adSlotSnapshot as never) ?? [],
      businessId: version.landingPage.businessId,
    })
  }

  private async htmlForSystemLayout(systemKey: string) {
    const [templateId, themePresetId] = systemKey.split(':')
    if (!templateId || !themePresetId) throw new Error(`Invalid systemKey ${systemKey}`)
    await ensureSystemTemplates(db)
    const template = await db.landingPageTemplate.findUniqueOrThrow({ where: { id: templateId } })
    const preset = PAGE_THEME_PRESETS.find((p) => p.id === themePresetId)
    if (!preset) throw new Error(`Unknown theme preset ${themePresetId}`)
    const content = systemStarterContent(template)
    return renderLandingPageHtml({
      pageName: template.name,
      templateSchema: template.schema as never,
      content,
      theme: themeFromPreset(preset) as never,
      layoutConfig: null,
      form: EMPTY_FORM,
      submitActionUrl: '#',
      adSlots: [],
    })
  }

  async regenerateAllSystemLayouts() {
    await ensureSystemTemplates(db)
    const templates = await db.landingPageTemplate.findMany({
      where: { isSystem: true },
      select: { id: true, name: true, schema: true },
    })
    let enqueued = 0
    for (const template of templates) {
      for (const preset of PAGE_THEME_PRESETS) {
        const content = systemStarterContent(template)
        const theme = themeFromPreset(preset)
        const sourceChecksum = checksumOf({
          templateId: template.id,
          theme,
          content,
          schema: template.schema,
        })
        await this.enqueueSystemLayout(systemLayoutKey(template.id, preset.id), sourceChecksum)
        enqueued += 1
      }
    }
    return enqueued
  }
}

export async function processPendingPageThumbnails(limit = 5) {
  return new PageThumbnailService().processPending(limit)
}
