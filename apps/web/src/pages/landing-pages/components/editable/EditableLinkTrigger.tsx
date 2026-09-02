import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// The one inline link/button editing primitive: double-clicking the rendered link/button opens a
// small anchored popover with Label + URL together (not a swap-to-input on the label itself) —
// one gesture, one place for both fields, since a CTA's URL has no visible surface of its own to
// double-click. Reused for every {label,url} pair in the editor (hero.primaryCta, footer.cta,
// list-item CTAs) — callers map their own field names into/out of the generic shape.
export function EditableLinkTrigger({
  label,
  url,
  onChange,
  children,
  className,
}: {
  label: string
  url: string
  onChange: (next: { label: string; url: string }) => void
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [draftLabel, setDraftLabel] = useState(label)
  const [draftUrl, setDraftUrl] = useState(url)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect -- both resetting the draft to the live
       label/url and measuring position genuinely need this effect: position requires a real DOM
       measurement (anchorRef.current.getBoundingClientRect()), only available post-mount — not
       React's "adjust state while rendering" pattern, which can't read a ref (react-hooks/refs). */
    setDraftLabel(label)
    setDraftUrl(url)
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) setPosition({ top: rect.bottom + 8, left: rect.left })
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, label, url])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      commit()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftLabel, draftUrl])

  function commit() {
    setOpen(false)
    if (draftLabel !== label || draftUrl !== url) onChange({ label: draftLabel, url: draftUrl })
  }

  return (
    <span
      ref={anchorRef}
      onDoubleClick={(event) => {
        event.preventDefault()
        setOpen(true)
      }}
      className={cn('relative inline-block cursor-text', className)}
    >
      {children}
      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Edit link"
              style={{ position: 'fixed', top: position.top, left: position.left }}
              className="z-[90] w-72 space-y-2 rounded-lg border border-border bg-popover p-3 shadow-lg"
            >
              <label className="block text-xs font-medium text-muted-foreground">
                Label
                <input
                  autoFocus
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  className="mt-1 w-full rounded border border-input-border bg-transparent px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                URL
                <input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit()
                  }}
                  className="mt-1 w-full rounded border border-input-border bg-transparent px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={commit}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
