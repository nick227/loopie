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

  // onClose is almost always a fresh closure every render (every caller defines its handleClose
  // inline) — depending on it directly used to re-run this whole effect on every keystroke inside
  // the modal, which re-stole focus onto dialogRef via the line below and made any input/textarea
  // inside a modal unusable. A ref keeps the mount/unmount side effects (focus capture, body
  // scroll lock, restoring focus on close) running exactly once per open, while onKey still always
  // calls the latest onClose.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
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
  }, [])

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        'shrink-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        full
          ? 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted'
          : 'text-sm',
      )}
      aria-label="Close"
    >
      {full ? (
        <>
          <X size={16} aria-hidden="true" />
          <span>Close</span>
        </>
      ) : (
        'Close'
      )}
    </button>
  )

  const node = (
    <div className="fixed inset-0 z-[80]">
      {full ? (
        <button
          type="button"
          className="modal-backdrop absolute inset-0 cursor-default bg-foreground/45 backdrop-blur-[2px]"
          aria-label="Close dialog"
          onClick={onClose}
        />
      ) : (
        <button
          type="button"
          className="modal-backdrop absolute inset-0 bg-foreground/40"
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
          'absolute z-10 flex min-h-0 flex-col overflow-hidden bg-background',
          full
            ? 'modal-sheet bottom-0 left-0 right-0 h-[94dvh] rounded-t-[1.25rem] border border-b-0 border-border shadow-2xl sm:h-[88dvh] sm:max-h-[56rem] sm:rounded-t-2xl'
            : cn(
                'left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border',
                size === 'xl' ? 'max-w-[480px]' : 'max-w-lg',
                'max-h-[calc(100vh-2rem)]',
              ),
        )}
      >
        {full ? (
          <div className="shrink-0 border-b border-border">
            <div className="flex h-5 items-center justify-center" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-center gap-3 px-3 pb-2 sm:px-5 sm:pb-3">
              <h2
                id={titleId}
                className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide"
              >
                {title}
              </h2>
              {closeButton}
            </div>
            {toolbar ? <div className="px-3 pb-3 sm:px-5">{toolbar}</div> : null}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 pt-4">
            <h2 id={titleId} className="shrink-0 text-sm font-medium uppercase tracking-wide">
              {title}
            </h2>
            {toolbar ? <div className="min-w-0 flex-1">{toolbar}</div> : <div className="flex-1" />}
            {closeButton}
          </div>
        )}
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
              full
                ? 'border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5'
                : 'px-4 pb-4 pt-4',
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
