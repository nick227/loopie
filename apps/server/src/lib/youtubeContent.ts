import { parseYoutubeId } from '@project/db'

// Content is canonical and a youtubeUrl can in principle live at any depth — walk generically
// rather than hardcode a path, same reasoning as pageMedia.ts's asset-id walk.
function walkYoutubeUrls(node: unknown, urls: string[]) {
  if (Array.isArray(node)) {
    for (const item of node) walkYoutubeUrls(item, urls)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if (typeof obj.youtubeUrl === 'string' && obj.youtubeUrl.trim()) urls.push(obj.youtubeUrl)
    for (const value of Object.values(obj)) walkYoutubeUrls(value, urls)
  }
}

export function assertYoutubeUrlsInContent(content: unknown) {
  const urls: string[] = []
  walkYoutubeUrls(content, urls)
  for (const url of urls) {
    if (!parseYoutubeId(url)) {
      throw {
        statusCode: 400,
        message: 'YouTube URL must be a youtube.com or youtu.be link.',
      }
    }
  }
}
