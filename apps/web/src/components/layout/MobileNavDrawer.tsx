import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MobileNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/**
 * Left slide-out primary nav for narrow viewports. Mirrors AssistantPanel's persistent-DOM
 * slide pattern (always mounted, transform + visibility) so open/close animates both ways.
 * Desktop keeps the inline tab strip in Shell — this is mobile-only chrome.
 */
export function MobileNavDrawer({
  open,
  onClose,
  businessName,
  items,
}: {
  open: boolean
  onClose: () => void
  businessName?: string
  items: MobileNavItem[]
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[45] bg-foreground/20 transition-opacity duration-300 md:hidden',
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-background shadow-2xl transition-[transform,visibility] duration-300 ease-out md:hidden',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p
              id={titleId}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Menu
            </p>
            {businessName ? (
              <Link
                to="/profile"
                onClick={onClose}
                className="mt-0.5 block truncate text-sm font-semibold text-foreground hover:underline"
              >
                {businessName}
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent',
                    )
                  }
                >
                  <item.icon size={18} className="shrink-0 opacity-80" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>,
    document.body,
  )
}
