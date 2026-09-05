import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Code2, Copy, ExternalLink, Share2 } from 'lucide-react'
import { toast } from 'sonner'

export function LandingPageShareMenu({
  hostedUrl,
  published,
  onEmbed,
}: {
  hostedUrl: string
  published: boolean
  onEmbed: () => void
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function copyLiveUrl() {
    try {
      await navigator.clipboard.writeText(hostedUrl)
      setCopied(true)
      toast.success('Live page link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Live page link could not be copied')
    }
  }

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-45'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input-border bg-transparent px-2.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Share2 size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Share</span>
        <ChevronDown size={13} aria-hidden="true" className="text-muted-foreground" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Share page"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <button
            type="button"
            disabled={!published}
            onClick={() => {
              window.open(hostedUrl, '_blank', 'noopener,noreferrer')
              setOpen(false)
            }}
            className={itemClass}
          >
            <ExternalLink size={15} aria-hidden="true" />
            Open live page
          </button>
          <button
            type="button"
            disabled={!published}
            onClick={() => void copyLiveUrl()}
            className={itemClass}
          >
            {copied ? (
              <Check size={15} aria-hidden="true" className="text-success" />
            ) : (
              <Copy size={15} aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy live URL'}
          </button>
          <button
            type="button"
            disabled={!published}
            onClick={() => {
              setOpen(false)
              onEmbed()
            }}
            className={itemClass}
          >
            <Code2 size={15} aria-hidden="true" />
            Embed code
          </button>
          {!published ? (
            <p className="border-t border-border px-2.5 pb-1 pt-2 text-[11px] leading-4 text-muted-foreground">
              Publish this page to enable sharing.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
