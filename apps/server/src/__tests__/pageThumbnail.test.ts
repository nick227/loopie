import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db } from '@project/db'
import {
  FAILED_THUMBNAIL_RETRY_MS,
  PageThumbnailService,
  resolveThumbnailFields,
  shouldEnqueueThumbnailRepair,
} from '../services/PageThumbnailService'
import { resetCapturePageThumbnail, setCapturePageThumbnail } from '../lib/pageThumbnailCapture'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Thumb Template',
      isSystem: true,
      schema: {
        sections: [
          { key: 'hero', type: 'hero', order: 0, hideable: false, editable: ['headline'] },
        ],
        themeTokens: [],
      },
    },
  })
}

describe('page thumbnail cache', () => {
  beforeEach(() => {
    setCapturePageThumbnail(async () => ({
      buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
        'base64',
      ),
      mimeType: 'image/jpeg',
      widthPx: 640,
      heightPx: 400,
    }))
  })

  afterEach(() => {
    resetCapturePageThumbnail()
  })

  it('resolveThumbnailFields marks READY only when checksum matches', () => {
    expect(resolveThumbnailFields(null, null, null).thumbnailStatus).toBe('NONE')
    expect(
      resolveThumbnailFields('v1', 'abc', {
        url: '/uploads/x.jpg',
        status: 'READY',
        sourceChecksum: 'abc',
        publishedVersionId: 'v1',
      }).thumbnailStatus,
    ).toBe('READY')
    expect(
      resolveThumbnailFields('v1', 'abc', {
        url: '/uploads/x.jpg',
        status: 'READY',
        sourceChecksum: 'old',
        publishedVersionId: 'v1',
      }).thumbnailStatus,
    ).toBe('STALE')
    expect(
      resolveThumbnailFields('v1', 'abc', {
        url: null,
        status: 'FAILED',
        sourceChecksum: 'abc',
        publishedVersionId: 'v1',
      }).thumbnailStatus,
    ).toBe('FAILED')
  })

  it('shouldEnqueueThumbnailRepair gates FAILED by updatedAt window', () => {
    const now = new Date('2026-09-04T12:00:00Z')
    const failed = {
      url: null,
      status: 'FAILED' as const,
      sourceChecksum: 'abc',
      publishedVersionId: 'v1',
      updatedAt: new Date(now.getTime() - FAILED_THUMBNAIL_RETRY_MS + 1_000),
    }
    expect(shouldEnqueueThumbnailRepair('v1', 'abc', failed, now)).toBe(false)
    expect(
      shouldEnqueueThumbnailRepair(
        'v1',
        'abc',
        { ...failed, updatedAt: new Date(now.getTime() - FAILED_THUMBNAIL_RETRY_MS - 1) },
        now,
      ),
    ).toBe(true)
    expect(
      shouldEnqueueThumbnailRepair('v1', 'abc', {
        url: '/uploads/x.jpg',
        status: 'READY',
        sourceChecksum: 'old',
        publishedVersionId: 'v1',
        updatedAt: now,
      }),
    ).toBe(true)
  })

  it('publish enqueues a PENDING thumbnail and processPending marks READY with a url', async () => {
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Thumb Page',
        slug: `thumb-page-${randomUUID().slice(0, 8)}`,
      },
    })
    expect(pageRes.statusCode).toBe(201)
    expect(pageRes.json().data.thumbnailStatus).toBe('NONE')
    const pageId = pageRes.json().data.id

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)
    const versionId = publishRes.json().data.id

    const pending = await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } })
    expect(pending?.status).toBe('PENDING')
    expect(pending?.sourceChecksum).toBeTruthy()

    const getPending = await app.inject({
      method: 'GET',
      url: `/landing-pages/${pageId}`,
      headers: asAuth(testUserId),
    })
    expect(getPending.statusCode).toBe(200)
    expect(getPending.json().data.thumbnailStatus).toBe('PENDING')

    await new PageThumbnailService().processPending(10)

    const ready = await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } })
    expect(ready?.status).toBe('READY')
    expect(ready?.url).toBe(`/uploads/thumb-${ready?.sourceChecksum}.jpg`)

    const getReady = await app.inject({
      method: 'GET',
      url: `/landing-pages/${pageId}`,
      headers: asAuth(testUserId),
    })
    expect(getReady.json().data.thumbnailStatus).toBe('READY')
    expect(getReady.json().data.thumbnailUrl).toBe(ready?.url)
    expect(getReady.json().data.thumbnailSourceVersionId).toBe(versionId)
  })

  it('refresh-thumbnail re-enqueues the current published version', async () => {
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Refresh Thumb',
        slug: `refresh-thumb-${randomUUID().slice(0, 8)}`,
      },
    })
    const pageId = pageRes.json().data.id
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    await new PageThumbnailService().processPending(10)

    const refresh = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/refresh-thumbnail`,
      headers: asAuth(testUserId),
    })
    expect(refresh.statusCode).toBe(202)
    expect(refresh.json().data.thumbnailStatus).toBe('PENDING')

    const versionId = refresh.json().data.thumbnailSourceVersionId
    const row = await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } })
    expect(row?.status).toBe('PENDING')
  })

  it('processPending marks FAILED when capture throws', async () => {
    setCapturePageThumbnail(async () => {
      throw new Error('browser missing')
    })
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Fail Thumb',
        slug: `fail-thumb-${randomUUID().slice(0, 8)}`,
      },
    })
    const pageId = pageRes.json().data.id
    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    const versionId = publishRes.json().data.id
    await new PageThumbnailService().processPending(10)
    const row = await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } })
    expect(row?.status).toBe('FAILED')
    expect(row?.lastError).toContain('browser missing')

    const get = await app.inject({
      method: 'GET',
      url: `/landing-pages/${pageId}`,
      headers: asAuth(testUserId),
    })
    expect(get.json().data.thumbnailStatus).toBe('FAILED')
    expect(get.json().data.thumbnailUrl).toBeNull()
  })

  it('list re-enqueues FAILED only after the retry window', async () => {
    setCapturePageThumbnail(async () => {
      throw new Error('browser missing')
    })
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Retry Thumb',
        slug: `retry-thumb-${randomUUID().slice(0, 8)}`,
      },
    })
    const pageId = pageRes.json().data.id
    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    const versionId = publishRes.json().data.id
    await new PageThumbnailService().processPending(10)
    expect(
      (await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } }))?.status,
    ).toBe('FAILED')

    const listFresh = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(testUserId),
    })
    expect(listFresh.statusCode).toBe(200)
    expect(
      (await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } }))?.status,
    ).toBe('FAILED')

    await db.pageThumbnail.update({
      where: { publishedVersionId: versionId },
      data: { updatedAt: new Date(Date.now() - FAILED_THUMBNAIL_RETRY_MS - 1_000) },
    })

    const listAged = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(testUserId),
    })
    expect(listAged.statusCode).toBe(200)
    expect(
      (await db.pageThumbnail.findUnique({ where: { publishedVersionId: versionId } }))?.status,
    ).toBe('PENDING')
  })

  it('late capture for a superseded publish does not become the live thumbnail', async () => {
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Race Thumb',
        slug: `race-thumb-${randomUUID().slice(0, 8)}`,
      },
    })
    const pageId = pageRes.json().data.id

    const pub1 = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    const v12 = pub1.json().data.id as string

    await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${pageId}`,
      headers: asAuth(testUserId),
      payload: {
        content: {
          hero: { headline: `v13-${randomUUID().slice(0, 6)}` },
        },
      },
    })
    const pub2 = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    const v13 = pub2.json().data.id as string
    expect(v13).not.toBe(v12)

    // Simulate a late worker finishing v12 after v13 is already live.
    await new PageThumbnailService().processOne(
      (await db.pageThumbnail.findUniqueOrThrow({ where: { publishedVersionId: v12 } })).id,
      async () => ({
        buffer: Buffer.from('late-v12'),
        mimeType: 'image/jpeg',
        widthPx: 640,
        heightPx: 400,
      }),
    )
    expect(await db.pageThumbnail.findUnique({ where: { publishedVersionId: v12 } })).toBeNull()

    await new PageThumbnailService().processPending(10)

    const live = await app.inject({
      method: 'GET',
      url: `/landing-pages/${pageId}`,
      headers: asAuth(testUserId),
    })
    expect(live.json().data.publishedVersionId).toBe(v13)
    expect(live.json().data.thumbnailSourceVersionId).toBe(v13)
    expect(live.json().data.thumbnailStatus).toBe('READY')
    const v13Thumb = await db.pageThumbnail.findUnique({ where: { publishedVersionId: v13 } })
    expect(live.json().data.thumbnailUrl).toBe(v13Thumb?.url)
  })

  it('discards READY write when sourceChecksum changed mid-capture', async () => {
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Checksum Race',
        slug: `checksum-race-${randomUUID().slice(0, 8)}`,
      },
    })
    const pageId = pageRes.json().data.id
    const pub = await app.inject({
      method: 'POST',
      url: `/landing-pages/${pageId}/publish`,
      headers: asAuth(testUserId),
    })
    const versionId = pub.json().data.id as string
    const row = await db.pageThumbnail.findUniqueOrThrow({
      where: { publishedVersionId: versionId },
    })

    let captureStarted!: () => void
    const gate = new Promise<void>((resolve) => {
      captureStarted = resolve
    })
    let releaseCapture!: () => void
    const hold = new Promise<void>((resolve) => {
      releaseCapture = resolve
    })

    const processing = new PageThumbnailService().processOne(row.id, async () => {
      captureStarted()
      await hold
      return {
        buffer: Buffer.from('stale-shot'),
        mimeType: 'image/jpeg',
        widthPx: 640,
        heightPx: 400,
      }
    })

    await gate
    await db.pageThumbnail.update({
      where: { id: row.id },
      data: { sourceChecksum: 'a'.repeat(64), status: 'PENDING', url: null },
    })
    releaseCapture()
    await processing

    const after = await db.pageThumbnail.findUniqueOrThrow({ where: { id: row.id } })
    expect(after.status).toBe('PENDING')
    expect(after.sourceChecksum).toBe('a'.repeat(64))
    expect(after.url).toBeNull()
  })

  it('system layout regen is idempotent for the same checksum', async () => {
    const service = new PageThumbnailService()
    const first = await service.regenerateAllSystemLayouts()
    expect(first).toBeGreaterThan(0)
    const before = await db.pageThumbnail.count({ where: { kind: 'SYSTEM_LAYOUT' } })
    const second = await service.regenerateAllSystemLayouts()
    expect(second).toBe(first)
    const after = await db.pageThumbnail.count({ where: { kind: 'SYSTEM_LAYOUT' } })
    expect(after).toBe(before)
  })
})
