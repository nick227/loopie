import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The one shared row primitive every list in the app renders through — Inbox, Contacts,
 * Advertisements, Pages, Media, Affiliates, and Home's "Live work" feed. See
 * docs/design/00-design-language-spec.md's "Universal List Row" section for the rationale:
 * six pages had drifted onto six different row shapes (a big two-column card for Ads/Pages, a
 * bespoke Card for Affiliates, hand-rolled flex rows for Inbox/Contacts, a square-grid card for
 * Media). Improve the row once here and every list improves with it — a page only ever decides
 * what data occupies which slot, never how the slot itself looks.
 *
 * Three density modes, not per-page variants:
 * - 'comfortable' (default) — the normal list row: thumbnail/avatar + title/subtitle + trailing.
 * - 'compact' — a leaner version of the same shape (smaller leading visual, tighter padding) for
 *   dense or secondary lists (Home's Live work feed).
 * - 'media' — a vertical tile (big square thumbnail on top, title/subtitle below) meant to sit
 *   inside a CSS grid, not a divided list — this is Media's shape.
 */

export type UniversalRowDensity = 'comfortable' | 'compact' | 'featured' | 'media'
export type UniversalRowAccent =
  'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'neutral'

const ACCENT_BORDER: Record<UniversalRowAccent, string> = {
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  info: 'border-l-info',
  destructive: 'border-l-destructive',
  neutral: 'border-l-muted-foreground/40',
}

const LEADING_SIZE: Record<Exclude<UniversalRowDensity, 'media'>, string> = {
  comfortable: 'h-10 w-10',
  compact: 'h-8 w-8',
  // Real preview art — a page hero, an ad creative, a channel identity — reads as a thumbnail,
  // not an icon, only past a certain size. Used by Pages/Advertising/Contacts/Messages, the four
  // surfaces sharing one structural grammar (metrics bar → actions → search → rows).
  featured: 'h-16 w-16',
}

export interface UniversalRowProps {
  density?: UniversalRowDensity
  href?: string
  /** Passed through to the underlying Link's `state` — the persistent header (Shell.tsx) reads
   * `state.from`/`state.fromTo` to show the real place this row was entered from ("‹ Contacts
   * Jane Smith") instead of a generic fallback, and to make Back navigate(-1) correctly. */
  state?: { from: string; fromTo: string }
  onClick?: () => void
  /** Left edge accent stripe, keyed to the app's semantic tokens — never an arbitrary color. */
  accent?: UniversalRowAccent
  /** Avatar/thumbnail/icon content. Sized and clipped by the row itself based on density+shape. */
  leading?: ReactNode
  /** 'circle' for a person/avatar identity, 'square' for a thumbnail (media, page, ad, asset). */
  leadingShape?: 'circle' | 'square'
  title: ReactNode
  subtitle?: ReactNode
  /** A small row of inline badges/tags under the subtitle — status pills, source tags, etc. */
  meta?: ReactNode
  /** Right-aligned block, usually one or two stacked lines (a value + a qualifier). */
  trailing?: ReactNode
  /** An explicit action element (a button/link), distinct from the row's own click/href target. */
  action?: ReactNode
  /** Trailing chevron implying "click to open." Defaults to true whenever href/onClick is set —
   * the same affordance everywhere a row is clickable, not a per-page choice. Pass false to
   * suppress it (e.g. a row whose only real action is an explicit `action` button). */
  chevron?: boolean
  selected?: boolean
  className?: string
}

export function UniversalRow({
  density = 'comfortable',
  href,
  state,
  onClick,
  accent,
  leading,
  leadingShape = 'square',
  title,
  subtitle,
  meta,
  trailing,
  action,
  chevron,
  selected = false,
  className,
}: UniversalRowProps) {
  const showChevron = chevron ?? Boolean(href || onClick)
  if (density === 'media') {
    return (
      <RowContainer
        href={href}
        state={state}
        onClick={onClick}
        selected={selected}
        className={cn(
          'flex-col items-stretch gap-0 rounded-lg border border-border p-0 overflow-hidden',
          className,
        )}
      >
        {leading ? (
          <div className="aspect-square w-full overflow-hidden bg-muted">{leading}</div>
        ) : null}
        <div className="space-y-0.5 p-2.5">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-1 pt-0.5">{meta}</div> : null}
        </div>
      </RowContainer>
    )
  }

  const comfortable = density === 'comfortable'
  const featured = density === 'featured'

  return (
    <RowContainer
      href={href}
      state={state}
      onClick={onClick}
      selected={selected}
      className={cn(
        // A border-bottom on the row itself, not a container-level divide-y — some lists
        // (Advertisements, Pages, Affiliates) render through VirtualInfiniteList, which
        // absolutely-positions each row and breaks CSS divide-y between siblings. Putting the
        // divider on the row means "same divider" holds whether a list is virtualized or not.
        'items-center gap-3 border-b border-l-2 border-b-border last:border-b-0',
        accent ? ACCENT_BORDER[accent] : 'border-l-transparent',
        featured ? 'px-4 py-4' : comfortable ? 'px-4 py-3.5' : 'px-3 py-2',
        className,
      )}
    >
      {leading ? (
        <span
          className={cn(
            'grid shrink-0 place-items-center overflow-hidden bg-muted text-xs font-semibold',
            LEADING_SIZE[density],
            leadingShape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {leading}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-medium text-foreground',
            featured ? 'text-[0.9rem]' : 'text-sm',
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
        {meta ? <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</span> : null}
      </span>

      {trailing ? (
        <span className="shrink-0 text-right text-xs text-muted-foreground">{trailing}</span>
      ) : null}

      {action ? <span className="shrink-0">{action}</span> : null}

      {showChevron ? (
        <ChevronRight
          size={16}
          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      ) : null}
    </RowContainer>
  )
}

function RowContainer({
  href,
  state,
  onClick,
  selected,
  className,
  children,
}: {
  href?: string
  state?: { from: string; fromTo: string }
  onClick?: () => void
  selected?: boolean
  className?: string
  children: ReactNode
}) {
  const shared = cn(
    'group flex outline-none transition-colors',
    selected ? 'bg-primary/10' : 'hover:bg-accent',
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    className,
  )

  if (href) {
    return (
      <Link to={href} state={state} className={shared}>
        {children}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(shared, 'w-full text-left')}>
        {children}
      </button>
    )
  }
  return <div className={shared}>{children}</div>
}

/** Shared list container — border + rounding only. Each row draws its own bottom divider (see
 * UniversalRow above — not container-level divide-y, so this works the same whether the list
 * inside is virtualized or a plain .map()). 'media' density rows go in a CSS grid instead, not
 * this container — gap replaces the divider entirely there. */
export function UniversalRowList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border', className)}>
      {children}
    </div>
  )
}

/** Convenience leading visual for a person/contact identity — initials on a tinted circle.
 * Pages needing custom per-item coloring (e.g. Contacts's per-source palette) can pass their own
 * `leading` node directly instead; this is just the common case. */
export function UniversalRowAvatar({
  initials,
  className,
}: {
  initials: string
  className?: string
}) {
  return (
    <span className={cn('flex h-full w-full items-center justify-center', className)}>
      {initials}
    </span>
  )
}
