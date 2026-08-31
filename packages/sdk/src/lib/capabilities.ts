export type ValidationResult = {
  state: 'READY' | 'NEEDS_ATTENTION' | 'UNSUPPORTED'
  warnings: string[]
}

export type PlatformCapability = {
  supportedMediaTypes: ('IMAGE' | 'VIDEO' | 'TEXT')[]
  recommendedAspectRatios?: string[]
  maxTextLength?: number
  requiresDestinationUrl: boolean
}

export const PLATFORM_CAPABILITIES: Record<string, PlatformCapability> = {
  META_FEED: {
    supportedMediaTypes: ['IMAGE', 'VIDEO'],
    recommendedAspectRatios: ['1:1', '4:5'],
    requiresDestinationUrl: true,
  },
  META_REEL: {
    supportedMediaTypes: ['VIDEO'],
    recommendedAspectRatios: ['9:16'],
    requiresDestinationUrl: true,
  },
  TIKTOK_FEED: {
    supportedMediaTypes: ['VIDEO'],
    recommendedAspectRatios: ['9:16'],
    maxTextLength: 150,
    requiresDestinationUrl: true,
  },
  GOOGLE_DISPLAY: {
    supportedMediaTypes: ['IMAGE', 'VIDEO'],
    recommendedAspectRatios: ['1:1', '16:9'],
    requiresDestinationUrl: true,
  },
  GOOGLE_YOUTUBE: {
    supportedMediaTypes: ['VIDEO'],
    recommendedAspectRatios: ['16:9'],
    requiresDestinationUrl: true,
  },
  GOOGLE_SEARCH: {
    supportedMediaTypes: ['TEXT'],
    maxTextLength: 90,
    requiresDestinationUrl: true,
  },
  YOUTUBE_SHORTS: {
    supportedMediaTypes: ['VIDEO'],
    recommendedAspectRatios: ['9:16'],
    requiresDestinationUrl: true,
  },
  YOUTUBE_INSTREAM: {
    supportedMediaTypes: ['VIDEO'],
    recommendedAspectRatios: ['16:9'],
    requiresDestinationUrl: true,
  },
  LOOPIE_PAGE: {
    supportedMediaTypes: ['IMAGE', 'VIDEO', 'TEXT'],
    recommendedAspectRatios: ['16:9', '1:1', '9:16'],
    requiresDestinationUrl: true,
  },
}

export function validateAdvertisement(
  ad: { mediaType?: 'IMAGE' | 'VIDEO' | 'TEXT'; aspectRatio?: string; text?: string; url?: string },
  platform: string,
  placement: string,
): ValidationResult {
  const profileKey = `${platform}_${placement}`.toUpperCase()
  const caps = PLATFORM_CAPABILITIES[profileKey]

  if (!caps) return { state: 'UNSUPPORTED', warnings: [`Unknown placement profile: ${profileKey}`] }

  const warnings: string[] = []

  if (!ad.mediaType) {
    return { state: 'UNSUPPORTED', warnings: ['Media is required'] }
  }

  if (!caps.supportedMediaTypes.includes(ad.mediaType)) {
    return {
      state: 'UNSUPPORTED',
      warnings: [`${profileKey} only supports ${caps.supportedMediaTypes.join(', ')}`],
    }
  }

  if (
    caps.recommendedAspectRatios &&
    ad.aspectRatio &&
    !caps.recommendedAspectRatios.includes(ad.aspectRatio)
  ) {
    warnings.push(`Recommended aspect ratio is ${caps.recommendedAspectRatios.join(' or ')}`)
  }

  if (caps.maxTextLength && ad.text && ad.text.length > caps.maxTextLength) {
    warnings.push(`Text exceeds ${caps.maxTextLength} characters`)
  }

  if (caps.requiresDestinationUrl && !ad.url) {
    warnings.push(`Destination URL is required for ${profileKey}`)
  }

  if (warnings.length > 0) {
    return { state: 'NEEDS_ATTENTION', warnings }
  }

  return { state: 'READY', warnings: [] }
}
