// Feed Ad POC (2026-09-02, see CLAUDE.md) — placement readiness for the three targets that
// naturally support "media + post-style text": River (LOOPIE's own feed, most permissive),
// LinkedIn Sponsored Content, and Meta Feed. Deliberately data-driven: image/video support, text
// limits, aspect ratios, and CTA/link rules are capabilities on a platform, not separate ad
// objects or per-platform code paths — extending this later means adding a row, not a branch.
// No connector exists for LinkedIn yet (see the Platform enum / CLAUDE.md's "no broad platform
// expansion" scope note) — this module is informational readiness only, independent of whether an
// AdRun can actually be provisioned there.
import type { components } from '@project/sdk'

type PlacementId = components['schemas']['Placement']

export type PlacementPlatform = 'RIVER' | 'META' | 'LINKEDIN'

export type PlacementCapability = {
  platform: PlacementPlatform
  label: string
  supportsImage: boolean
  supportsVideo: boolean
  // Recommended primary-text length before the platform truncates/warns — not a hard limit.
  primaryTextLimit: number
  // Placement aspect-ratio buckets (see assetPlacements.ts) this platform's feed prefers. Empty =
  // no real preference (River — the most permissive native target).
  preferredPlacements: PlacementId[]
  requiresCta: boolean
  requiresDestinationUrl: boolean
}

export const PLACEMENT_CAPABILITIES: PlacementCapability[] = [
  {
    platform: 'RIVER',
    label: 'River',
    supportsImage: true,
    supportsVideo: true,
    primaryTextLimit: 2000,
    preferredPlacements: [],
    requiresCta: false,
    requiresDestinationUrl: false,
  },
  {
    platform: 'META',
    label: 'Meta Feed',
    supportsImage: true,
    supportsVideo: true,
    primaryTextLimit: 125,
    preferredPlacements: ['SQUARE', 'PORTRAIT'],
    requiresCta: true,
    requiresDestinationUrl: true,
  },
  {
    platform: 'LINKEDIN',
    label: 'LinkedIn Sponsored Content',
    supportsImage: true,
    supportsVideo: true,
    primaryTextLimit: 150,
    preferredPlacements: ['LANDSCAPE', 'SQUARE'],
    requiresCta: true,
    requiresDestinationUrl: true,
  },
]

export type ReadinessState = 'READY' | 'NEEDS_ATTENTION' | 'UNSUPPORTED'

export type PlacementReadiness = {
  platform: PlacementPlatform
  label: string
  state: ReadinessState
  warnings: string[]
}

export type CreativeInput = {
  mediaType?: 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO'
  placements: PlacementId[]
  primaryText?: string | null
  ctaLabel?: string | null
  destinationUrl?: string | null
}

export function evaluatePlacementReadiness(creative: CreativeInput): PlacementReadiness[] {
  return PLACEMENT_CAPABILITIES.map((cap) => {
    if (!creative.mediaType) {
      return {
        platform: cap.platform,
        label: cap.label,
        state: 'UNSUPPORTED',
        warnings: ['Add media to check compatibility'],
      }
    }
    if (creative.mediaType === 'VIDEO' && !cap.supportsVideo) {
      return {
        platform: cap.platform,
        label: cap.label,
        state: 'UNSUPPORTED',
        warnings: [`${cap.label} does not support video`],
      }
    }
    if (creative.mediaType === 'IMAGE' && !cap.supportsImage) {
      return {
        platform: cap.platform,
        label: cap.label,
        state: 'UNSUPPORTED',
        warnings: [`${cap.label} does not support images`],
      }
    }
    if (creative.mediaType === 'TEXT' || creative.mediaType === 'AUDIO') {
      return {
        platform: cap.platform,
        label: cap.label,
        state: 'UNSUPPORTED',
        warnings: [`${cap.label} needs an image or video creative`],
      }
    }

    const warnings: string[] = []
    if (
      cap.preferredPlacements.length > 0 &&
      !creative.placements.some((id) => cap.preferredPlacements.includes(id))
    ) {
      warnings.push(`Aspect ratio may crop in ${cap.label}`)
    }
    const textLength = creative.primaryText?.trim().length ?? 0
    if (textLength > cap.primaryTextLimit) {
      warnings.push(`Primary text over ${cap.label}'s ~${cap.primaryTextLimit}-character guidance`)
    }
    if (cap.requiresCta && !creative.ctaLabel?.trim()) {
      warnings.push(`${cap.label} needs a call-to-action label`)
    }
    if (cap.requiresDestinationUrl && !creative.destinationUrl?.trim()) {
      warnings.push(`${cap.label} needs a destination URL`)
    }

    return {
      platform: cap.platform,
      label: cap.label,
      state: warnings.length > 0 ? 'NEEDS_ATTENTION' : 'READY',
      warnings,
    }
  })
}
