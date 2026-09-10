import type { BrowserContext } from 'playwright'
import { openHtmlCaptureBrowser } from './htmlCaptureBrowser'
export { isBlockedCaptureUrl } from './htmlCaptureBrowser'

export type PageThumbnailCaptureResult = {
  buffer: Buffer
  mimeType: 'image/jpeg'
  widthPx: number
  heightPx: number
}

export type CapturePageThumbnail = (html: string) => Promise<PageThumbnailCaptureResult>

/** Fixed list-card preview contract — do not vary per page. */
export const THUMB_VIEWPORT = { width: 1280, height: 800 } as const
export const THUMB_DEVICE_SCALE = 0.5
export const THUMB_JPEG_QUALITY = 72
export const THUMB_OUTPUT_WIDTH = Math.round(THUMB_VIEWPORT.width * THUMB_DEVICE_SCALE)
export const THUMB_OUTPUT_HEIGHT = Math.round(THUMB_VIEWPORT.height * THUMB_DEVICE_SCALE)
export const THUMB_MIME = 'image/jpeg' as const

/** Brief settle after DOM ready so fonts/layout paint without waiting on every network request. */
const SETTLE_MS = 400

const CAPTURE_MODE_HEAD = `
<meta name="lp-capture" content="1" />
<style id="lp-capture-mode">
html[data-lp-capture="1"] *,
html[data-lp-capture="1"] *::before,
html[data-lp-capture="1"] *::after {
  animation: none !important;
  animation-delay: 0s !important;
  animation-duration: 0s !important;
  transition: none !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
html[data-lp-capture="1"] .lp-logo-marquee-track {
  animation: none !important;
  transform: none !important;
}
</style>
<script>
document.documentElement.setAttribute('data-lp-capture', '1');
</script>
`

let captureOverride: CapturePageThumbnail | null = null

export function setCapturePageThumbnail(fn: CapturePageThumbnail) {
  captureOverride = fn
}

export function resetCapturePageThumbnail() {
  captureOverride = null
}

export function injectCaptureMode(html: string): string {
  if (html.includes('id="lp-capture-mode"')) return html
  if (html.includes('</head>')) return html.replace('</head>', `${CAPTURE_MODE_HEAD}</head>`)
  return `${CAPTURE_MODE_HEAD}${html}`
}

async function screenshotHtml(
  context: BrowserContext,
  html: string,
): Promise<PageThumbnailCaptureResult> {
  const page = await context.newPage()
  try {
    await page.setViewportSize(THUMB_VIEWPORT)
    await page.setContent(injectCaptureMode(html), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await new Promise((r) => setTimeout(r, SETTLE_MS))
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: THUMB_JPEG_QUALITY,
      clip: {
        x: 0,
        y: 0,
        width: THUMB_VIEWPORT.width,
        height: THUMB_VIEWPORT.height,
      },
    })
    return {
      buffer: Buffer.from(buffer),
      mimeType: THUMB_MIME,
      widthPx: THUMB_OUTPUT_WIDTH,
      heightPx: THUMB_OUTPUT_HEIGHT,
    }
  } finally {
    await page.close()
  }
}

export type PageThumbnailCaptureSession = {
  capture: CapturePageThumbnail
  close: () => Promise<void>
}

/** One Chromium context for a whole processPending / regen batch. No cookies/storage. */
export async function openCaptureSession(): Promise<PageThumbnailCaptureSession> {
  if (captureOverride) {
    return {
      capture: captureOverride,
      close: async () => {},
    }
  }
  const session = await openHtmlCaptureBrowser({
    viewport: THUMB_VIEWPORT,
    deviceScaleFactor: THUMB_DEVICE_SCALE,
    javaScriptEnabled: true,
  })
  return {
    capture: (html) => screenshotHtml(session.context, html),
    close: session.close,
  }
}

/** Single-shot capture (opens and closes its own browser). Prefer openCaptureSession for batches. */
export async function capturePageThumbnail(html: string) {
  const session = await openCaptureSession()
  try {
    return await session.capture(html)
  } finally {
    await session.close()
  }
}
