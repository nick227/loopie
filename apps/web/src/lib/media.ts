export const MAX_MEDIA_BYTES = 4 * 1024 * 1024

export const ALLOWED_MEDIA_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
] as const

export const MEDIA_FILE_ACCEPT = ALLOWED_MEDIA_MIMES.join(',')

export function mediaFileError(file: File): string | null {
  if (file.size === 0 || file.size > MAX_MEDIA_BYTES) {
    return 'File must be between 1 byte and 4 MB'
  }
  if (!(ALLOWED_MEDIA_MIMES as readonly string[]).includes(file.type)) {
    return 'Unsupported file type'
  }
  return null
}

export function mediaSrc(url: string | null | undefined) {
  if (!url) return null
  if (/^(https?:|data:|blob:)/.test(url)) return url
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
  return `${base}${url}`
}

export function formatBytes(sizeBytes: number | null | undefined) {
  if (sizeBytes == null) return null
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(durationMs: number | null | undefined) {
  if (durationMs == null) return null
  const total = Math.round(durationMs / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const PLACEMENT_LABEL: Record<string, string> = {
  SQUARE: '1:1 Feed',
  PORTRAIT: '4:5 Feed',
  STORY: '9:16 Story',
  LANDSCAPE: '16:9 Landscape',
}
