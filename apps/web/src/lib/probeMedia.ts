export type ProbedSpecs = {
  mimeType: string
  sizeBytes: number
  widthPx?: number
  heightPx?: number
  durationMs?: number
  type: 'IMAGE' | 'VIDEO' | 'AUDIO'
}

function typeFromMime(mimeType: string): ProbedSpecs['type'] {
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  return 'IMAGE'
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string) {
  return new Promise<{ widthPx: number; heightPx: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ widthPx: img.naturalWidth, heightPx: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read image'))
    img.src = url
  })
}

function loadVideo(url: string) {
  return new Promise<{ widthPx: number; heightPx: number; durationMs: number }>(
    (resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () =>
        resolve({
          widthPx: video.videoWidth,
          heightPx: video.videoHeight,
          durationMs: Math.round(video.duration * 1000),
        })
      video.onerror = () => reject(new Error('Could not read video'))
      video.src = url
    },
  )
}

export async function probeFile(file: File): Promise<ProbedSpecs> {
  const type = typeFromMime(file.type)
  const objectUrl = URL.createObjectURL(file)
  try {
    if (type === 'IMAGE') {
      const size = await loadImage(objectUrl)
      return { mimeType: file.type, sizeBytes: file.size, type, ...size }
    }
    if (type === 'VIDEO') {
      const size = await loadVideo(objectUrl)
      return { mimeType: file.type, sizeBytes: file.size, type, ...size }
    }
    return { mimeType: file.type, sizeBytes: file.size, type }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function probeImageUrl(url: string) {
  try {
    return await loadImage(url)
  } catch {
    return null
  }
}
