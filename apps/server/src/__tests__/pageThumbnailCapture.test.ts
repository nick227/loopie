import { describe, it, expect } from 'vitest'
import {
  injectCaptureMode,
  isBlockedCaptureUrl,
  THUMB_JPEG_QUALITY,
  THUMB_MIME,
  THUMB_OUTPUT_HEIGHT,
  THUMB_OUTPUT_WIDTH,
  THUMB_VIEWPORT,
} from '../lib/pageThumbnailCapture'
import { assertSafeKey } from '../lib/mediaStorage/local'

describe('page thumbnail capture helpers', () => {
  it('locks a fixed output contract', () => {
    expect(THUMB_VIEWPORT).toEqual({ width: 1280, height: 800 })
    expect(THUMB_OUTPUT_WIDTH).toBe(640)
    expect(THUMB_OUTPUT_HEIGHT).toBe(400)
    expect(THUMB_JPEG_QUALITY).toBe(72)
    expect(THUMB_MIME).toBe('image/jpeg')
  })

  it('injects capture mode that disables motion', () => {
    const html = injectCaptureMode('<html><head></head><body>hi</body></html>')
    expect(html).toContain('data-lp-capture')
    expect(html).toContain('animation: none')
    expect(html).toContain('id="lp-capture-mode"')
    expect(injectCaptureMode(html)).toBe(html)
  })

  it('blocks private network hosts and allows public https', () => {
    expect(isBlockedCaptureUrl('http://127.0.0.1/secret')).toBe(true)
    expect(isBlockedCaptureUrl('http://192.168.1.10/x')).toBe(true)
    expect(isBlockedCaptureUrl('http://10.0.0.5/x')).toBe(true)
    expect(isBlockedCaptureUrl('http://169.254.169.254/latest')).toBe(true)
    expect(isBlockedCaptureUrl('file:///etc/passwd')).toBe(true)
    expect(isBlockedCaptureUrl('https://fonts.googleapis.com/css')).toBe(false)
    expect(isBlockedCaptureUrl('data:image/png;base64,aaa')).toBe(false)
  })

  it('accepts content-addressed thumbnail upload keys', () => {
    expect(() => assertSafeKey(`thumb-${'ab'.repeat(32)}.jpg`)).not.toThrow()
  })
})
