const YOUTUBE_ID = /^[\w-]{11}$/

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./i, '').toLowerCase()
}

export function parseYoutubeId(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const host = hostOf(url)
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id && YOUTUBE_ID.test(id) ? id : null
  }
  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const v = url.searchParams.get('v')
    if (v && YOUTUBE_ID.test(v)) return v
    const parts = url.pathname.split('/').filter(Boolean)
    if (
      (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') &&
      parts[1] &&
      YOUTUBE_ID.test(parts[1])
    ) {
      return parts[1]
    }
  }
  return null
}

export function youtubeEmbedUrl(raw: string): string | null {
  const id = parseYoutubeId(raw)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}
