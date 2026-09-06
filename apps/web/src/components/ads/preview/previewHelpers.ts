export function destinationHost(url: string | undefined) {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function truncate(text: string, max: number) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}
