export type Platform = 'META' | 'TIKTOK' | 'GOOGLE' | 'YOUTUBE'

export type AdMedia = {
  type: 'IMAGE' | 'VIDEO'
  url: string
  aspectRatio: string
  duration?: number
}

export type AdvertisementData = {
  name: string
  text?: string
  media?: AdMedia
  destinationUrl?: string
}

export type CompatibilityState = 'READY' | 'NEEDS_ATTENTION' | 'UNSUPPORTED'

export type ValidationResult = {
  state: CompatibilityState
  warnings: string[]
}

export function validateAdCompatibility(
  ad: AdvertisementData,
  platform: Platform,
): ValidationResult {
  const warnings: string[] = []

  // Check baseline requirements
  if (!ad.media) {
    return { state: 'UNSUPPORTED', warnings: ['Media is required for all platforms'] }
  }

  switch (platform) {
    case 'TIKTOK':
      if (ad.media.type !== 'VIDEO') {
        return { state: 'UNSUPPORTED', warnings: ['TikTok only supports Video media'] }
      }
      if (ad.media.aspectRatio !== '9:16') {
        warnings.push('9:16 aspect ratio is recommended for TikTok')
      }
      if (ad.text && ad.text.length > 150) {
        warnings.push('Caption exceeds recommendation (keep under 150 chars)')
      }
      if (!ad.destinationUrl) {
        warnings.push('Destination URL is required to drive traffic')
      }
      break

    case 'META':
      if (
        ad.media.aspectRatio !== '1:1' &&
        ad.media.aspectRatio !== '4:5' &&
        ad.media.aspectRatio !== '9:16'
      ) {
        warnings.push('Aspect ratio may crop on Meta feeds')
      }
      if (!ad.destinationUrl) {
        warnings.push('Destination URL is required for Feed/Story placements')
      }
      break

    case 'GOOGLE':
      if (ad.media.type === 'VIDEO') {
        return { state: 'UNSUPPORTED', warnings: ['Google Search does not support Video media'] }
      }
      if (!ad.text || ad.text.length < 30) {
        warnings.push('Search ads require strong headline and description text')
      }
      break

    case 'YOUTUBE':
      if (ad.media.type !== 'VIDEO') {
        return { state: 'UNSUPPORTED', warnings: ['YouTube requires Video media'] }
      }
      if (ad.media.aspectRatio !== '16:9' && ad.media.aspectRatio !== '9:16') {
        warnings.push('Use 16:9 for in-stream or 9:16 for Shorts')
      }
      break
  }

  if (warnings.length > 0) {
    return { state: 'NEEDS_ATTENTION', warnings }
  }

  return { state: 'READY', warnings: [] }
}
