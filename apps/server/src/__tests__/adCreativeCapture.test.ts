import { describe, it, expect } from 'vitest'
import { openAdCreativeCaptureSession } from '../lib/adCreativeCapture'
import { capturePageThumbnail } from '../lib/pageThumbnailCapture'
import { openHtmlCaptureBrowser } from '../lib/htmlCaptureBrowser'

const document = (body: string) =>
  `<!doctype html><html><head><style>body{margin:0}</style></head><body>${body}</body></html>`

describe('real browser capture', () => {
  it('exports exact PNG dimensions with creative scripts disabled', async () => {
    const session = await openAdCreativeCaptureSession()
    try {
      const html = document('<p data-ad-text>Hello</p>')
      const shot = await session.capture(html, { width: 1080, height: 1350 })
      const scripted = await session.capture(
        document('<p data-ad-text>Hello</p><script>document.body.innerHTML="changed"</script>'),
        { width: 1080, height: 1350 },
      )
      expect(shot.buffer.readUInt32BE(16)).toBe(1080)
      expect(shot.buffer.readUInt32BE(20)).toBe(1350)
      expect(shot.mimeType).toBe('image/png')
      expect(scripted.buffer.equals(shot.buffer)).toBe(true)
    } finally {
      await session.close()
    }
  })

  it('rejects broken images, overflowing copy, and invalid dimensions', async () => {
    const session = await openAdCreativeCaptureSession()
    try {
      await expect(
        session.capture(document('<img src="data:image/png;base64,broken">'), {
          width: 100,
          height: 100,
        }),
      ).rejects.toThrow()
      await expect(
        session.capture(document('<p data-ad-text style="width:200px">Too wide</p>'), {
          width: 100,
          height: 100,
        }),
      ).rejects.toThrow('overflows')
      await expect(session.capture(document(''), { width: 0, height: 100 })).rejects.toThrow(
        'dimensions',
      )
    } finally {
      await session.close()
    }
  })

  it('preserves the actual Page thumbnail JPEG at 640×400', async () => {
    const shot = await capturePageThumbnail(document('<h1>Page thumbnail</h1>'))
    expect(shot.mimeType).toBe('image/jpeg')
    const browser = await openHtmlCaptureBrowser({})
    try {
      const page = await browser.context.newPage()
      const dimensions = await page.evaluate(
        async (src) => {
          const img = new Image()
          img.src = src
          await img.decode()
          return [img.naturalWidth, img.naturalHeight]
        },
        `data:image/jpeg;base64,${shot.buffer.toString('base64')}`,
      )
      expect(dimensions).toEqual([640, 400])
    } finally {
      await browser.close()
    }
  })
})
