import { cn } from '@/lib/utils'
import type { AdPreviewDraft, AdPreviewPlacement } from './types'
import { AD_PREVIEW_PLACEMENTS } from './types'
import { MetaFeedPreview } from './MetaFeedPreview'
import { InstagramStoryPreview } from './InstagramStoryPreview'
import { GoogleDisplayPreview } from './GoogleDisplayPreview'
import { RiverPreview } from './RiverPreview'

export function AdPreview({
  advertisement,
  placement,
  onPlacementChange,
}: {
  advertisement: AdPreviewDraft
  placement: AdPreviewPlacement
  onPlacementChange: (placement: AdPreviewPlacement) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Preview placement">
        {AD_PREVIEW_PLACEMENTS.map((item) => {
          const active = item.id === placement
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPlacementChange(item.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div
        data-testid="ad-preview"
        className="flex min-h-[28rem] items-start justify-center rounded-xl border border-border bg-muted/30 p-4 sm:p-6"
      >
        {placement === 'meta-feed' ? <MetaFeedPreview advertisement={advertisement} /> : null}
        {placement === 'instagram-story' ? (
          <InstagramStoryPreview advertisement={advertisement} />
        ) : null}
        {placement === 'google-display' ? (
          <GoogleDisplayPreview advertisement={advertisement} />
        ) : null}
        {placement === 'river' ? <RiverPreview advertisement={advertisement} /> : null}
      </div>
    </div>
  )
}
