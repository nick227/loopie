import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

// Same private/loopback/link-local guard as lib/crm/woocommerce.ts#isPrivateAddress — duplicated,
// not shared, matching this codebase's own established precedent for a small pure function used
// by two unrelated domains (see withSid() being duplicated between apps/server and apps/ad-server
// for the same reason).
function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '')
  if (isIP(normalized) === 4) {
    return (
      /^127\./.test(normalized) ||
      /^10\./.test(normalized) ||
      /^192\.168\./.test(normalized) ||
      /^169\.254\./.test(normalized) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
      normalized === '0.0.0.0'
    )
  }
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized)
  )
}

const FETCH_TIMEOUT_MS = 4000
const MAX_BYTES = 200_000 // more than enough for any real page's <head>

export type LinkPreview = {
  title: string | null
  description: string | null
  imageUrl: string | null
}

function extractMeta(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(html)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function metaTagPattern(property: string): RegExp {
  // Attribute order varies (content before/after property) — cover both, case-insensitively.
  return new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i',
  )
}
function metaTagPatternReversed(property: string): RegExp {
  return new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  )
}

// Fetches a business-supplied URL server-side and pulls <title>/og:* tags — a real SSRF surface
// (arbitrary user input, server-side fetch), handled explicitly: resolve the hostname first and
// refuse private/loopback/link-local addresses before ever making the request, cap how much of
// the response we read, and time out quickly. Never throws — a broken/slow/blocked link just
// means no preview, not a failed post (see RiverPostService#create).
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return null
  // Same DNS-resolve-then-check gate as lib/crm/woocommerce.ts#assertPublicStore, including the
  // same known limitation: a DNS-rebinding attacker could resolve differently between this check
  // and fetch()'s own resolution. Matches this codebase's existing accepted risk level for this
  // class of check rather than introducing new machinery (IP-pinned connections) neither
  // consumer has needed yet.
  const addresses = await lookup(host, { all: true, verbatim: true }).catch(() => [])
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Loopie-LinkPreview/1.0' },
    })
    if (!res.ok || !res.body) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
    }
    await reader.cancel().catch(() => {})
    const html = Buffer.concat(chunks).toString('utf-8')

    const title =
      extractMeta(html, [metaTagPattern('og:title'), metaTagPatternReversed('og:title')]) ??
      /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ??
      null
    const description = extractMeta(html, [
      metaTagPattern('og:description'),
      metaTagPatternReversed('og:description'),
      metaTagPattern('description'),
      metaTagPatternReversed('description'),
    ])
    const imageUrl = extractMeta(html, [
      metaTagPattern('og:image'),
      metaTagPatternReversed('og:image'),
    ])

    if (!title && !description && !imageUrl) return null
    return { title, description, imageUrl }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
