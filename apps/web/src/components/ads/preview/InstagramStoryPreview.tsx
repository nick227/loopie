import type { AdPreviewDraft } from './types'
import { AdPreviewMedia, truncate } from './shared'

export function InstagramStoryPreview({ advertisement }: { advertisement: AdPreviewDraft }) {
  const cta = advertisement.ctaLabel.trim() || 'Learn More'
  const primary = advertisement.primaryText.trim()
  const headline = advertisement.headline.trim()

  return (
    <div className="mx-auto flex w-full max-w-[280px] justify-center">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.75rem] border-[3px] border-foreground/90 bg-foreground shadow-lg">
        <div className="absolute inset-0">
          <AdPreviewMedia asset={advertisement.asset} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

        <div className="absolute inset-x-3 top-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/90 text-[10px] font-bold leading-8 text-center text-foreground">
            YB
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">yourbusiness</span>
          <span className="text-[10px] text-white/70">Sponsored</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pb-6">
          {headline ? (
            <p className="text-lg font-semibold leading-snug text-white drop-shadow">
              {truncate(headline, 48)}
            </p>
          ) : null}
          {primary ? (
            <p className="text-sm leading-snug text-white/90 drop-shadow">
              {truncate(primary, 100)}
            </p>
          ) : null}
          <div className="rounded-full bg-white px-4 py-2.5 text-center text-sm font-semibold text-foreground">
            {cta}
          </div>
        </div>
      </div>
    </div>
  )
}
