import { useNavigate } from 'react-router-dom'
import { useLandingPages } from '@project/sdk'
import { LayoutTemplate, Link2, Type, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFlatPages } from '@/hooks/useFlatPages'

// Three format-based starters (what the ad itself is) fill fixed slots; the rest go to the
// business's own published pages (what it's promoting) — capped so the row never exceeds six
// tiles total, the same "minimal jump-offs" ceiling PagesStartRow holds itself to.
const MAX_TILES = 6
const FORMAT_TILE_COUNT = 3
const MAX_PAGE_TILES = MAX_TILES - FORMAT_TILE_COUNT

/**
 * Ads' equivalent of Pages' "Start a new page" row (PagesStartRow.tsx) — the same product bet
 * that jump-offs expressing purpose beat one generic "New ad" button. An ad's purpose splits two
 * ways: what it's driving traffic to (the business's own published pages, one-click destination
 * prefill via CreateAdPage's `pageId` param) and what format it is (a text-only post or a video,
 * via CreateAdPage's `kind` param — see AdEditor's initialMediaPickerType/autoFocusPrimaryText).
 */
export function AdsStartRow() {
  const navigate = useNavigate()
  const pages = useFlatPages(useLandingPages({ status: 'PUBLISHED', limit: MAX_PAGE_TILES }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pages.map((page) => (
          <StartTile
            key={page.id}
            icon={LayoutTemplate}
            label={page.name}
            description="Drive traffic to this page"
            onClick={() => navigate(`/ads/new?pageId=${page.id}`)}
          />
        ))}
        <StartTile
          icon={Video}
          label="Video ad"
          description="Start with a video and let the visuals sell it"
          onClick={() => navigate('/ads/new?kind=video')}
        />
        <StartTile
          icon={Type}
          label="Text ad"
          description="A pure text post — no media required"
          onClick={() => navigate('/ads/new?kind=text')}
        />
        <StartTile
          icon={Link2}
          label="Promote a link"
          description="Point an ad at any URL you already have"
          onClick={() => navigate('/ads/new')}
        />
      </div>
      {pages.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Publish a page to promote it directly from here.
        </p>
      ) : null}
    </div>
  )
}

function StartTile({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: typeof LayoutTemplate
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent',
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
