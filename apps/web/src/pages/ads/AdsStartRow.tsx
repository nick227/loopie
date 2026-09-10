import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLandingPages } from '@project/sdk'
import { Image, Rows3, Square, LayoutTemplate, Link2, Type, Video, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFlatPages } from '@/hooks/useFlatPages'
import { AdCatalogStartRow } from './AdCatalogStartRow'

// Purpose first (2026-09-10) — AdCatalogStartRow's 8-item Ad Type catalog, with real screenshots,
// is now the primary "what do you want to create?" choice, mirroring Pages' own Page Type picker
// (docs/strategy/ads-defaults-and-catalog-proposal.md). The older format-first picker (Ad
// Designer, 2026-09-03) and the generic Video/Text/Link/page-promotion starters below are
// preserved, not removed — real, working, tested flows — but demoted to a secondary "or start
// from a format" section, the same relationship Pages' own Layout choice now has to Page Type.
const MAX_TILES = 6
const FORMAT_TILE_COUNT = 3
const MAX_PAGE_TILES = MAX_TILES - FORMAT_TILE_COUNT

export function AdsStartRow() {
  const navigate = useNavigate()
  const pages = useFlatPages(useLandingPages({ status: 'PUBLISHED', limit: MAX_PAGE_TILES }))
  const [showFormats, setShowFormats] = useState(false)

  return (
    <div className="space-y-3">
      <AdCatalogStartRow />

      {!showFormats ? (
        <button
          type="button"
          onClick={() => setShowFormats(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Or start from a format <ChevronDown size={14} />
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StartTile
              icon={Image}
              label="Poster"
              description="Bold, portrait — a printable-feeling promo"
              onClick={() => navigate('/ads/new?format=POSTER')}
            />
            <StartTile
              icon={Rows3}
              label="Story"
              description="Tall and full-bleed, built for a vertical feed"
              onClick={() => navigate('/ads/new?format=STORY')}
            />
            <StartTile
              icon={Square}
              label="Feed Post"
              description="Square, native to a scrolling feed"
              onClick={() => navigate('/ads/new?format=FEED_POST')}
            />
          </div>
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
        </>
      )}
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
