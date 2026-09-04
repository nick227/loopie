import type { AdPreviewDraft } from './types'
import { AdPreviewMedia, destinationHost, truncate } from './shared'

export function GoogleDisplayPreview({ advertisement }: { advertisement: AdPreviewDraft }) {
  const host = destinationHost(advertisement.destinationUrl) ?? 'example.com'
  const cta = advertisement.ctaLabel.trim() || 'Learn More'
  const headline = advertisement.headline.trim() || advertisement.name.trim() || 'Your ad'
  const primary = advertisement.primaryText.trim()

  return (
    <div className="mx-auto w-full max-w-lg space-y-3">
      <div className="rounded-lg border border-border bg-muted/40 p-4 shadow-inner">
        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>example-news.site</span>
          <span>Ads</span>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="h-2 w-3/4 rounded bg-border" />
          <div className="h-2 w-full rounded bg-border" />
          <div className="h-2 w-5/6 rounded bg-border" />
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface shadow-sm">
          <div className="flex gap-3 p-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
              <AdPreviewMedia asset={advertisement.asset} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Ad · {host}
              </p>
              <p className="text-sm font-semibold leading-snug text-foreground">
                {truncate(headline, 40)}
              </p>
              {primary ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {truncate(primary, 90)}
                </p>
              ) : null}
              <span className="inline-block pt-1 text-xs font-semibold text-primary">{cta}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <div className="h-2 w-full rounded bg-border" />
          <div className="h-2 w-2/3 rounded bg-border" />
        </div>
      </div>
    </div>
  )
}
