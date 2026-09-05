import type { Browser, BrowserContext } from 'playwright'
import { PUBLIC_BASE_URL, PUBLIC_SERVER_URL } from './urls'

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

function allowedMediaHosts(): Set<string> {
  const hosts = new Set<string>()
  for (const raw of [PUBLIC_SERVER_URL, PUBLIC_BASE_URL]) {
    try {
      hosts.add(new URL(raw).hostname.toLowerCase())
    } catch {
      // ignore malformed env
    }
  }
  return hosts
}

/** Treat rendered page network as untrusted — block private/localhost except our media origins. */
export function isBlockedCaptureUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return true
  }
  if (url.protocol === 'data:' || url.protocol === 'blob:') return false
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true

  const host = url.hostname.toLowerCase()
  if (allowedMediaHosts().has(host)) return false

  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    host === '[::1]'
  ) {
    return true
  }

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 169 && b === 254) return true
  return false
}

async function bindCaptureIsolation(context: BrowserContext) {
  await context.route('**/*', async (route) => {
    const reqUrl = route.request().url()
    if (isBlockedCaptureUrl(reqUrl)) {
      await route.abort()
      return
    }
    await route.continue()
  })
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
  const { chromium } = await import('playwright')
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({
    viewport: THUMB_VIEWPORT,
    deviceScaleFactor: THUMB_DEVICE_SCALE,
    javaScriptEnabled: true,
    acceptDownloads: false,
    // Explicit empty identity — never inherit host cookies/tokens.
    storageState: undefined,
  })
  await bindCaptureIsolation(context)
  return {
    capture: (html) => screenshotHtml(context, html),
    close: async () => {
      await context.close()
      await browser.close()
    },
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
