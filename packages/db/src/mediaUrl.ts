export function absoluteMediaUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return null
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  const base = origin.replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}
