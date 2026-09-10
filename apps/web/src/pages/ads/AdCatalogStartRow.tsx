import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBusiness } from '@project/sdk'
import {
  AD_TYPE_REGISTRY,
  AD_CATALOG_FORMATS,
  createStarterAds,
  type AdCatalogFormatKey,
} from '@project/ad-renderer'
import { MetaFeedPreview } from '@/components/ads/preview/MetaFeedPreview'
import { InstagramStoryPreview } from '@/components/ads/preview/InstagramStoryPreview'
import { GoogleDisplayPreview } from '@/components/ads/preview/GoogleDisplayPreview'
import { RiverPreview } from '@/components/ads/preview/RiverPreview'
import type { AdPreviewDraft } from '@/components/ads/preview/types'

// The 8-item starter Ad Type catalog (packages/ad-renderer's AD_TYPE_REGISTRY) — the Ads-side
// mirror of Pages' PagesStartRow (2026-09-10). Purpose first (what is this ad for), not format
// first — same lesson Pages already proved.
//
// 2026-09-10 correction — a thumbnail's job is to show what that starter actually looks like as
// an ad, not a generic colored card. Rather than maintain a second, server-rendered "ad creative"
// design that could drift from the real thing, each tile renders the *exact same* Meta Feed /
// Instagram Story / Google Display / River preview component the Ad Editor itself uses (see
// apps/web/src/components/ads/preview/), fed with this business's own real content via
// createStarterAds().
//
// 2026-09-10 second correction — the first version scaled each preview to fill the tile's width
// and cropped whatever didn't fit vertically (matching Pages' `object-cover object-top`). That's
// wrong here: unlike a page screenshot, an ad mockup's most identifying chrome is often anchored
// at the *bottom* (Instagram Story's headline+CTA pill overlay, Meta Feed/River's footer CTA
// button) — cropping from the top cut off exactly the part that makes each format recognizable.
// `AdFormatThumb` below instead measures the real rendered content (ResizeObserver, not a fixed
// per-format constant) and scales to *contain* the whole thing inside the tile — smaller on a
// verbose business's longer copy, but nothing ever gets clipped.
const FORMAT_NATIVE_WIDTH: Record<AdCatalogFormatKey, number> = {
  'meta-feed': 448, // MetaFeedPreview's own max-w-md
  'instagram-story': 280, // InstagramStoryPreview's own max-w-[280px] phone frame
  'google-display': 512, // GoogleDisplayPreview's own max-w-lg
  river: 448, // RiverPreview's own max-w-md
}

const PREVIEW_BY_FORMAT: Record<
  AdCatalogFormatKey,
  ComponentType<{ advertisement: AdPreviewDraft }>
> = {
  'meta-feed': MetaFeedPreview,
  'instagram-story': InstagramStoryPreview,
  'google-display': GoogleDisplayPreview,
  river: RiverPreview,
}

/** Scales `children` (rendered at `nativeWidth`) down to fit entirely inside a fixed 4:3 tile. */
function AdFormatThumb({ nativeWidth, children }: { nativeWidth: number; children: ReactNode }) {
  const outerRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const recompute = () => {
      const outerRect = outer.getBoundingClientRect()
      const innerHeight = inner.scrollHeight
      if (outerRect.width === 0 || innerHeight === 0) return
      setScale(Math.min(outerRect.width / nativeWidth, outerRect.height / innerHeight))
    }
    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(outer)
    return () => observer.disconnect()
     
    // innerHeight (e.g. a longer business description); re-measure whenever it changes.
  }, [nativeWidth, children])

  return (
    <span
      ref={outerRef}
      className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted"
    >
      <span
        ref={innerRef}
        className="pointer-events-none block"
        style={{ width: nativeWidth, transform: scale != null ? `scale(${scale})` : undefined }}
      >
        {children}
      </span>
    </span>
  )
}

export function AdCatalogStartRow() {
  const navigate = useNavigate()
  const business = useBusiness().data?.data

  if (!business) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    )
  }

  const ads = createStarterAds({
    name: business.name,
    tagline: business.tagline ?? undefined,
    description: business.description ?? undefined,
    location: business.location ?? undefined,
    destinationUrl: business.website ?? undefined,
  })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ads.map((ad) => {
        const type = AD_TYPE_REGISTRY[ad.typeKey]
        const Preview = PREVIEW_BY_FORMAT[ad.formatKey]
        const draft: AdPreviewDraft = {
          name: ad.content.businessName,
          primaryText: ad.content.body ?? '',
          headline: ad.content.headline,
          ctaLabel: ad.content.ctaLabel ?? '',
          destinationUrl: ad.destinationUrl ?? '',
          asset: ad.content.mediaUrl
            ? {
                id: `starter-${ad.typeKey}`,
                businessId: business.id,
                type: 'IMAGE',
                name: `${type.label} illustration`,
                url: ad.content.mediaUrl,
                placements: [],
                usedInAds: 0,
                usedInTemplates: 0,
                createdAt: new Date().toISOString(),
              }
            : null,
        }
        return (
          <button
            key={ad.typeKey}
            type="button"
            onClick={() => navigate(`/ads/new?adType=${ad.typeKey}`)}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-primary/50"
          >
            <span className="relative block w-full">
              <AdFormatThumb nativeWidth={FORMAT_NATIVE_WIDTH[ad.formatKey]}>
                <Preview advertisement={draft} />
              </AdFormatThumb>
              <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                {AD_CATALOG_FORMATS[ad.formatKey].label}
              </span>
            </span>
            <span className="px-2.5 py-2 text-sm font-medium text-foreground">{type.label}</span>
          </button>
        )
      })}
    </div>
  )
}
