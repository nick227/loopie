import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({
  title,
  onClose,
  children,
  footer,
  toolbar,
  size = 'md',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  toolbar?: ReactNode
  size?: 'md' | 'xl' | 'full'
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const full = size === 'full'

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
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
  }, [onClose])

  const node = (
    <div className="fixed inset-0 z-[80]">
      {full ? (
        <div className="absolute inset-0 bg-foreground/40" />
      ) : (
        <button
          type="button"
          className="absolute inset-0 bg-foreground/40"
          aria-label="Close"
          onClick={onClose}
        />
      )}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute z-10 flex min-h-0 flex-col overflow-hidden border border-border bg-background',
          full
            ? 'inset-0 rounded-none'
            : cn(
                'left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg',
                size === 'xl' ? 'max-w-4xl' : 'max-w-lg',
                'max-h-[calc(100vh-2rem)]',
              ),
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center gap-3',
            full ? 'border-b border-border px-4 py-3 sm:px-5' : 'px-4 pt-4',
          )}
        >
          <h2 id={titleId} className="shrink-0 text-sm font-medium uppercase tracking-wide">
            {title}
          </h2>
          {toolbar ? <div className="min-w-0 flex-1">{toolbar}</div> : <div className="flex-1" />}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            {full ? <X size={18} /> : 'Close'}
          </button>
        </div>
        <div
          className={cn(
            'min-h-0 flex-1',
            full ? 'flex flex-col overflow-hidden' : 'overflow-y-auto px-4 pt-3',
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              'flex shrink-0 justify-end gap-3',
              full ? 'border-t border-border px-4 py-3 sm:px-5' : 'px-4 pb-4 pt-4',
            )}
          >
            {footer}
          </div>
        ) : !full ? (
          <div className="h-4 shrink-0" />
        ) : null}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
