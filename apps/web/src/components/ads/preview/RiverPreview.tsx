import type { AdPreviewDraft } from './types'
import { AdPreviewMedia, truncate } from './shared'

export function RiverPreview({ advertisement }: { advertisement: AdPreviewDraft }) {
  const cta = advertisement.ctaLabel.trim() || 'Learn More'
  const primary = advertisement.primaryText.trim()
  const headline = advertisement.headline.trim()

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          YB
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">Your Business</p>
          <p className="text-[11px] text-muted-foreground">on River · Sponsored</p>
        </div>
      </div>

      {headline || primary ? (
        <div className="space-y-1 px-3 py-3">
          {headline ? (
            <p className="text-base font-semibold text-foreground">{truncate(headline, 80)}</p>
          ) : null}
          {primary ? (
            <p className="text-sm leading-relaxed text-foreground/90">{truncate(primary, 200)}</p>
          ) : null}
        </div>
      ) : null}

      <div className="aspect-video w-full overflow-hidden bg-muted">
        <AdPreviewMedia asset={advertisement.asset} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
        <span className="text-xs text-muted-foreground">In-app placement</span>
        <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          {cta}
        </span>
      </div>
    </div>
  )
}
