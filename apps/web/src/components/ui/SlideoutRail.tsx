import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// The one generic slide-out primitive, shared by Time Tracking's "Start Work" rail and Calendar's
// "Assign & Estimate" rail. Owns exactly: open/close, backdrop, Escape, focus entry/return, scroll
// containment, and dialog semantics — the same focus-trap logic as Modal.tsx, just anchored to the
// right edge instead of centered. It knows nothing about tasks, forms, headers, footers, or any
// specific workflow. A `title` prop would mean it's started absorbing product concerns — resist
// that; let the child content render its own heading.
export function SlideoutRail({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    railRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab' || !railRef.current) return
      const focusable = Array.from(
        railRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]!
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/10"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={railRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute right-0 bottom-0 flex h-full w-full max-w-sm flex-col overflow-y-auto',
          'animate-rail-in border-l h-[220px] border-border bg-background p-4 shadow-2xl',
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
