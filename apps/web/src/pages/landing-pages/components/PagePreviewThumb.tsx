import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import type { components } from '@project/sdk'
import { mediaSrc } from '@/lib/media'
import { thumbUrl } from './PageRow'

type LandingPage = components['schemas']['LandingPage']

// There is no generated-screenshot pipeline yet for drafts (see PageThumbnailService) — published
// pages use a cached screenshot via `page.thumbnailUrl` when READY. List responses don't resolve
// asset-library media (only withResolvedMedia'd export/render calls do — see LandingPageService.export),
// so a hero image is only ever available here when it's a plain pasted URL. Rather than fall back to
// a generic icon in every other case, this recreates the actual hero in miniature from the same
// content/theme data the real renderer reads — real headline, real CTA label, real theme colors.
// Used as the list fallback whenever the screenshot cache is missing, pending, stale, or failed.
export function PagePreviewThumb({ page }: { page: LandingPage }) {
  const [broken, setBroken] = useState(false)
  const content = (page.content ?? {}) as Record<string, unknown>
  const hero = (content.hero ?? {}) as {
    eyebrow?: string
    headline?: string
    primaryCta?: { label?: string }
  }
  const nav = (content.nav ?? {}) as { brand?: string }
  const theme = (page.theme ?? {}) as Record<string, unknown>
  const primaryColor = typeof theme.primaryColor === 'string' ? theme.primaryColor : '#7C3AED'
  const onPrimaryColor = typeof theme.onPrimaryColor === 'string' ? theme.onPrimaryColor : '#FFFFFF'
  const backgroundColor =
    typeof theme.backgroundColor === 'string' ? theme.backgroundColor : '#EEF0F4'
  const inkColor = typeof theme.inkColor === 'string' ? theme.inkColor : '#16181D'
  const headingFont = typeof theme.headingFont === 'string' ? theme.headingFont : 'Georgia, serif'

  const src = mediaSrc(thumbUrl(page.content))
  const headline = hero.headline?.trim() || page.name
  const ctaLabel = hero.primaryCta?.label?.trim()
  const hasPhoto = Boolean(src) && !broken

  if (!hero.headline && !src) {
    // A genuinely empty draft — nothing real to preview yet.
    return (
      <div className="grid h-full w-full place-items-center text-muted-foreground">
        <LayoutTemplate size={22} />
      </div>
    )
  }

  return (
    <div
      className="relative flex h-full w-full flex-col justify-end overflow-hidden"
      style={{ background: hasPhoto ? undefined : backgroundColor }}
    >
      {hasPhoto ? (
        <>
          <img
            src={src ?? undefined}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        </>
      ) : null}

      {nav.brand ? (
        <span
          className="absolute right-2.5 top-2.5 max-w-[55%] truncate text-[10px] font-bold tracking-tight"
          style={{ color: hasPhoto ? '#fff' : inkColor, fontFamily: headingFont }}
        >
          {nav.brand}
        </span>
      ) : null}

      <div className="relative z-10 p-3">
        {hero.eyebrow ? (
          <span
            className="mb-1 block text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: hasPhoto ? 'rgba(255,255,255,0.85)' : primaryColor }}
          >
            {hero.eyebrow}
          </span>
        ) : null}
        <p
          className="line-clamp-2 text-[0.9rem] font-bold leading-tight"
          style={{ color: hasPhoto ? '#fff' : inkColor, fontFamily: headingFont }}
        >
          {headline}
        </p>
        {ctaLabel ? (
          <span
            className="mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: primaryColor, color: onPrimaryColor }}
          >
            {ctaLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
