import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'
import { useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'
import { mediaSrc } from '@/lib/media'
import { ChevronLeft } from 'lucide-react'

// Page Type first, Layout second — see docs/strategy/pages-page-types-and-style-axes-roadmap.md.
// Revised 2026-09-10 (§9): always visible on the Pages list, no "New page" toggle-reveal — and
// real screenshots of each Layout's own actual starter content (via the PageThumbnail
// SYSTEM_LAYOUT pipeline, synced onto LandingPageTemplate.previewImageUrl) instead of generic
// icon tiles. Order/labels for the eight Page Types are presentation-only — the authoritative
// PageType value comes from each Layout's own `pageType` field; only the copy is hardcoded here,
// since there's no per-PageType metadata endpoint yet (a small, fixed, product-governed list).
const PAGE_TYPE_META: Record<string, { label: string; description: string }> = {
  HOME: {
    label: 'Home page',
    description: 'Your company site — services, proof, and a way to get in touch.',
  },
  LANDING: {
    label: 'Landing page',
    description: 'One focused offer with a form, built to convert a single audience.',
  },
  STUDIO: {
    label: 'Studio',
    description: 'Brand-forward site for a creative agency or small studio.',
  },
  PORTFOLIO: {
    label: 'Portfolio',
    description: 'Image-led showcase of your work, personal or freelance.',
  },
  EMAIL_CAPTURE: {
    label: 'Email capture',
    description: 'A short pitch and a signup form — nothing else to distract from it.',
  },
  STORE: { label: 'Store', description: 'A product grid with a path to buy or inquire.' },
  EVENT: {
    label: 'Event',
    description: 'Countdown, host details, and registration for something live.',
  },
  GENERAL: { label: 'Blank', description: 'An empty starting point with no assumed purpose.' },
}

// Foundational/general-purpose types before niche ones; Blank last (a deliberate fallback, not a
// first-choice option) — independent of however the API happens to return rows.
const PAGE_TYPE_ORDER = [
  'HOME',
  'LANDING',
  'STUDIO',
  'PORTFOLIO',
  'EMAIL_CAPTURE',
  'STORE',
  'EVENT',
  'GENERAL',
]

export function PagesStartRow({ onError }: { onError: (message: string | null) => void }) {
  const templatesQuery = useLandingPageTemplates()
  const templates = useFlatPages(templatesQuery)
  const quickCreate = useQuickCreatePage()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [openType, setOpenType] = useState<string | null>(null)

  async function start(templateId: string) {
    onError(null)
    setPendingId(templateId)
    const result = await quickCreate.create(templateId)
    if (!result.ok) {
      onError(result.message)
      setPendingId(null)
    }
  }

  const loading = templatesQuery.isLoading
  const disabled = loading || pendingId !== null

  const byType = new Map<string, typeof templates>()
  for (const template of templates) {
    const pageType = (template as { pageType?: string }).pageType
    if (!pageType) continue
    if (!byType.has(pageType)) byType.set(pageType, [])
    byType.get(pageType)!.push(template)
  }
  const availableTypes = PAGE_TYPE_ORDER.filter((t) => (byType.get(t)?.length ?? 0) > 0)

  const activeType = openType && byType.has(openType) ? openType : null

  if (loading) {
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

  // Step 2: a Page Type is open — show only that type's Layouts. Picking a Layout creates
  // immediately (same one-click behavior as before); nothing here asks for a second confirmation.
  if (activeType) {
    const meta = PAGE_TYPE_META[activeType]
    const layouts = byType.get(activeType) ?? []
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOpenType(null)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} /> {meta?.label ?? activeType}
        </button>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {layouts.map((layout) => (
            <ScreenshotTile
              key={layout.id}
              label={layout.name}
              imageUrl={mediaSrc((layout as { previewImageUrl?: string | null }).previewImageUrl)}
              pending={pendingId === layout.id}
              disabled={disabled}
              onClick={() => start(layout.id)}
            />
          ))}
        </div>
      </div>
    )
  }

  // Step 1: pick a Page Type — one screenshot tile per type, taken from its first Layout. A type
  // with only one Layout has no real second decision left to make — Step 2 would just be showing
  // the user the same single tile again, an unwanted extra click before reaching the editor — so
  // it creates and navigates immediately, same one-click behavior as picking a Layout in Step 2.
  // Only a genuinely multi-Layout type (Studio: Creative studio + Portfolio) still opens Step 2,
  // since there's a real choice to make there.
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {availableTypes.map((pageType) => {
        const meta = PAGE_TYPE_META[pageType]
        const layouts = byType.get(pageType) ?? []
        const primary = layouts[0]
        return (
          <ScreenshotTile
            key={pageType}
            label={meta?.label ?? pageType}
            imageUrl={mediaSrc(
              (primary as { previewImageUrl?: string | null } | undefined)?.previewImageUrl,
            )}
            pending={pendingId === primary?.id}
            disabled={disabled}
            badge={layouts.length > 1 ? `${layouts.length} layouts` : undefined}
            onClick={() =>
              layouts.length === 1 && primary ? start(primary.id) : setOpenType(pageType)
            }
          />
        )
      })}
    </div>
  )
}

function ScreenshotTile({
  label,
  imageUrl,
  pending,
  disabled,
  badge,
  onClick,
}: {
  label: string
  imageUrl: string | null
  pending: boolean
  disabled: boolean
  badge?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-primary/50 disabled:opacity-50',
      )}
    >
      <span className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Preview unavailable
          </span>
        )}
        {badge ? (
          <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="px-2.5 py-2 text-sm font-medium text-foreground">
        {pending ? 'Creating…' : label}
      </span>
    </button>
  )
}
