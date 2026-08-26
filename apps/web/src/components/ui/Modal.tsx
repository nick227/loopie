import { type ReactNode, useEffect } from 'react'

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-background p-4"
      >
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 id="modal-title" className="text-sm font-medium tracking-wide uppercase">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-sm underline underline-offset-4">
            Close
          </button>
        </div>
        {children}
        {footer ? <div className="mt-4 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  )
}
