export type NormalizeOriginOptions = {
  allowHttpLocalhost?: boolean
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Returns the exact normalized origin used for allowlist storage and comparison.
 * Paths, credentials, wildcards, query strings, fragments, and non-HTTP schemes are rejected.
 */
export function normalizeEmbedOrigin(input: string, options: NormalizeOriginOptions = {}): string {
  if (input.trim() !== input || input.length === 0 || input.includes('*')) {
    throw new TypeError('Origin must be non-empty, trimmed, and contain no wildcard')
  }
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]+\/?$/.test(input)) {
    throw new TypeError('Origin cannot contain a path, query, or fragment')
  }

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    throw new TypeError('Origin must be an absolute URL')
  }

  if (parsed.username || parsed.password) throw new TypeError('Origin cannot contain credentials')
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new TypeError('Origin cannot contain a path, query, or fragment')
  }

  if (parsed.protocol === 'https:') return parsed.origin
  if (
    parsed.protocol === 'http:' &&
    options.allowHttpLocalhost === true &&
    LOCAL_HOSTS.has(parsed.hostname)
  ) {
    return parsed.origin
  }
  throw new TypeError('Origin must use HTTPS')
}

export function originMatchesAllowlist(
  requestOrigin: string | null | undefined,
  normalizedAllowedOrigins: ReadonlySet<string>,
  options: NormalizeOriginOptions = {},
): boolean {
  if (!requestOrigin || requestOrigin === 'null') return false
  try {
    return normalizedAllowedOrigins.has(normalizeEmbedOrigin(requestOrigin, options))
  } catch {
    return false
  }
}
