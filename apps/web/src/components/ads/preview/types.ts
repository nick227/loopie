import type { components } from '@project/sdk'

export type AdPreviewPlacement = 'meta-feed' | 'instagram-story' | 'google-display' | 'river'

export type AdPreviewDraft = {
  name: string
  primaryText: string
  headline: string
  ctaLabel: string
  destinationUrl: string
  asset?: components['schemas']['Asset'] | null
}

export const AD_PREVIEW_PLACEMENTS: {
  id: AdPreviewPlacement
  label: string
}[] = [
  { id: 'meta-feed', label: 'Meta Feed' },
  { id: 'instagram-story', label: 'Instagram Story' },
  { id: 'google-display', label: 'Google Display' },
  { id: 'river', label: 'River' },
]
