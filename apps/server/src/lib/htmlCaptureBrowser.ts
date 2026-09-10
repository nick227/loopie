import type { BrowserContext, BrowserContextOptions } from 'playwright'
import { PUBLIC_BASE_URL, PUBLIC_SERVER_URL } from './urls'

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

/**
 * Set in production (see apps/server/Dockerfile) to Alpine's own apk-installed Chromium —
 * Playwright's bundled/downloaded Chromium binary assumes glibc and doesn't reliably run on
 * Alpine's musl libc, so the production image skips that download entirely
 * (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1) and points here instead. Left unset, Playwright launches
 * its own downloaded browser exactly as before — local dev and CI are unaffected.
 */
const CHROMIUM_EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined

/** Shared browser isolation only; each caller owns its capture/output contract. */
export async function openHtmlCaptureBrowser(options: BrowserContextOptions) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
    executablePath: CHROMIUM_EXECUTABLE_PATH,
  })
  try {
    const context = await browser.newContext({
      ...options,
      acceptDownloads: false,
      storageState: undefined,
    })
    await bindCaptureIsolation(context)
    return { context, close: () => browser.close() }
  } catch (error) {
    await browser.close()
    throw error
  }
}
