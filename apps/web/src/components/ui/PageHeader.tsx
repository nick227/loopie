import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PageHeaderVariant = 'list' | 'detail' | 'editor'

/**
 * One step per variant on the same type scale, not an arbitrary per-page size.
 * list/detail share the top step; editor is one step down ("quieter" — the
 * editor's own content should dominate, not the chrome around it).
 */
const TITLE_CLASS: Record<PageHeaderVariant, string> = {
  list: 'text-2xl font-bold tracking-tight text-foreground',
  detail: 'text-2xl font-bold tracking-tight text-foreground',
  editor: 'text-xl font-semibold tracking-tight text-foreground',
}

const GHOST_INPUT =
  'w-full min-w-0 rounded-none border-0 bg-transparent p-0 outline-none focus-visible:ring-0'

export interface PageHeaderEditableTitle {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

export interface PageHeaderBreadcrumb {
  label: string
  to: string
}

export interface PageHeaderProps {
  variant: PageHeaderVariant
  /** Optional as of the persistent header (Shell.tsx) — it already names the current collection/
   * entity in every case this page-body title used to duplicate. Omit both `title` and
   * `editableTitle` on a page whose identity the header already shows; pass one when this page
   * has no persistent-header presence (e.g. a page reached only via the "‹ Inbox" generic
   * fallback) or when the in-page title is itself a functional control (an inline rename input),
   * not just a redundant label. */
  title?: string
  editableTitle?: PageHeaderEditableTitle
  /** Optional visual anchor rendered before the title/description block (e.g. an entity's own
   * avatar/logo). Generic on purpose — not named after any one domain — so any detail page can
   * use it, not just Contacts. */
  leading?: ReactNode
  description?: ReactNode
  breadcrumb?: PageHeaderBreadcrumb
  meta?: ReactNode
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  className?: string
  children?: ReactNode
}

/**
 * The one shared page-header primitive. Variants change hierarchy (what's
 * present, how quiet the title is), never the underlying spacing, action
 * alignment, or responsive behavior — those stay identical across list,
 * detail, and editor so every surface reads as the same system.
 */
export function PageHeader({
  variant,
  title,
  editableTitle,
  leading,
  description,
  breadcrumb,
  meta,
  primaryAction,
  secondaryActions,
  className,
  children,
}: PageHeaderProps) {
  const titleClass = TITLE_CLASS[variant]

  return (
    <div className={cn('space-y-3', className)}>
      {breadcrumb ? (
        <Link
          to={breadcrumb.to}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {breadcrumb.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0 space-y-1">
            {editableTitle ? (
              <input
                aria-label={editableTitle.ariaLabel ?? title}
                defaultValue={editableTitle.value}
                placeholder={editableTitle.placeholder}
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (next && next !== editableTitle.value) editableTitle.onCommit(next)
                }}
                className={cn(GHOST_INPUT, titleClass)}
              />
            ) : title ? (
              <h1 className={titleClass}>{title}</h1>
            ) : null}
            {meta}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>

        {primaryAction || secondaryActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  )
}
