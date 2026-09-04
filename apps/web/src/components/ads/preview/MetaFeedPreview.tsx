import type { AdPreviewDraft } from './types'
import { AdPreviewMedia, destinationHost, truncate } from './shared'

export function MetaFeedPreview({ advertisement }: { advertisement: AdPreviewDraft }) {
  const host = destinationHost(advertisement.destinationUrl)
  const cta = advertisement.ctaLabel.trim() || 'Learn More'
  const primary = advertisement.primaryText.trim()
  const headline = advertisement.headline.trim()

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          YB
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">Your Business</p>
          <p className="text-[11px] text-muted-foreground">Sponsored</p>
        </div>
        <span className="text-muted-foreground" aria-hidden>
          ···
        </span>
      </div>

      {primary ? (
        <p className="px-3 pb-2 text-sm leading-relaxed text-foreground">
          {truncate(primary, 220)}
        </p>
      ) : null}

      <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
        <AdPreviewMedia asset={advertisement.asset} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/50 px-3 py-2.5">
        <div className="min-w-0">
          {host ? (
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {host}
            </p>
          ) : null}
          {headline ? (
            <p className="truncate text-sm font-semibold text-foreground">
              {truncate(headline, 60)}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border">
          {cta}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span>128 likes</span>
        <span>24 comments · 12 shares</span>
      </div>
    </div>
  )
}
