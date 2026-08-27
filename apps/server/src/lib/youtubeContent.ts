import { parseYoutubeId } from '@project/db'

type SectionContent = Record<string, unknown> & { youtubeUrl?: unknown }

export function assertYoutubeUrlsInContent(content: unknown) {
  const sections = (content as { sections?: Record<string, SectionContent> } | null)?.sections
  if (!sections) return
  for (const section of Object.values(sections)) {
    const url = section.youtubeUrl
    if (typeof url !== 'string' || !url.trim()) continue
    if (!parseYoutubeId(url)) {
      throw {
        statusCode: 400,
        message: 'YouTube URL must be a youtube.com or youtu.be link.',
      }
    }
  }
}
