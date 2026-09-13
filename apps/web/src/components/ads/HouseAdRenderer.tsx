import React, { useEffect, useRef, useState, memo, useCallback } from 'react'
import { useServeHouseAd, useTrackHouseAdMetric } from '@project/sdk'
import { mediaSrc } from '@/lib/media'

// A WORDPRESS_EMBED script is third-party and can fail for reasons outside this app
// (see the injection effect below); one retry, then the slot goes quiet.
const MAX_EMBED_ATTEMPTS = 2
const EMBED_RETRY_DELAY_MS = 800

interface HouseAdRendererProps {
  placement: string
}

// Memoized to prevent React from wiping out the 3rd party script's injected HTML
// when the parent re-renders due to mutation state changes.
const StaticEmbedZone = memo(
  function StaticEmbedZone({
    placement,
    onClick,
    innerRef,
  }: {
    placement: string
    onClick: () => void
    innerRef: React.Ref<HTMLDivElement>
  }) {
    return (
      <div
        ref={innerRef}
        className="wp-advertising-zone"
        data-zone={placement.toLowerCase().replace(/_/g, '-')}
        data-wpa-track="1"
        onClick={onClick}
      />
    )
  },
  (prev, next) => prev.placement === next.placement,
)

export function HouseAdRenderer({ placement }: HouseAdRendererProps) {
  const { data: adData, isLoading } = useServeHouseAd(placement)
  const ad = adData?.data
  const trackMetric = useTrackHouseAdMetric()
  const containerRef = useRef<HTMLDivElement | HTMLAnchorElement>(null)
  const trackedViewId = useRef<string | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [embedFailed, setEmbedFailed] = useState(false)

  const handleTrackClick = useCallback(() => {
    if (ad?.id) {
      trackMetric.mutate({ id: ad.id, zone: placement, type: 'click' })
    }
  }, [ad, placement, trackMetric])

  useEffect(() => {
    const currentAd = ad
    if (!currentAd || !containerRef.current) return
    if (trackedViewId.current === currentAd.id) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && currentAd?.id) {
          trackMetric.mutate({ id: currentAd.id, zone: placement, type: 'view' })
          trackedViewId.current = currentAd.id
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [ad, placement, trackMetric])

  useEffect(() => {
    if (ad?.type !== 'WORDPRESS_EMBED' || !ad.scriptUrl || !wrapperRef.current) return

    const wrapper = wrapperRef.current
    const scriptUrl = ad.scriptUrl
    let cancelled = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    setEmbedFailed(false)

    const inject = () => {
      if (cancelled) return
      attempt += 1

      // Clean up any previously injected script to prevent duplicates on re-render/retry
      wrapper.querySelectorAll('script[data-wp-advertising-embed]').forEach((s) => s.remove())

      const script = document.createElement('script')
      script.async = true
      script.src = scriptUrl
      script.setAttribute('data-wp-advertising-embed', '1')
      // A publisher host guarded by a bot/JS challenge answers a visitor it doesn't
      // recognize with an HTML "checking your browser" interstitial instead of the
      // script, which the browser then refuses to execute (MIME mismatch / ORB). A
      // cross-origin <script> can never clear such a challenge on its own, but hosts
      // typically stop issuing it once they've seen the request, so one retry usually
      // succeeds where the first load could not. If it still fails we render nothing
      // rather than leaving a dead slot behind.
      script.onerror = () => {
        if (cancelled) return
        if (attempt < MAX_EMBED_ATTEMPTS) {
          retryTimer = setTimeout(inject, EMBED_RETRY_DELAY_MS)
          return
        }
        setEmbedFailed(true)
      }
      wrapper.appendChild(script)
    }

    inject()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [ad])

  if (isLoading) return <div className="h-24 bg-muted/20 animate-pulse rounded-lg" />
  if (!ad) return null // Render nothing gracefully if no active ad

  if (ad.type === 'WORDPRESS_EMBED') {
    if (embedFailed) return null
    return (
      <div ref={wrapperRef}>
        <StaticEmbedZone
          placement={placement}
          onClick={handleTrackClick}
          innerRef={containerRef as React.RefObject<HTMLDivElement>}
        />
      </div>
    )
  }

  // Internal Ad
  return (
    <a
      ref={containerRef as React.RefObject<HTMLAnchorElement>}
      href={ad.targetUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative w-full overflow-hidden rounded-xl border group hover:border-primary transition-colors"
      onClick={() => trackMetric.mutate({ id: ad.id, zone: placement, type: 'click' })}
    >
      {ad.imageUrl && (
        <img
          src={mediaSrc(ad.imageUrl) || ad.imageUrl}
          alt={ad.name}
          className="w-full h-auto object-cover transition-transform group-hover:scale-[1.02]"
        />
      )}
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground border">
        Ad
      </div>
    </a>
  )
}
