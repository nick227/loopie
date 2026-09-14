import { useEffect, useId, useRef, useState } from 'react'
import { Download, History, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { getApiClient } from '@project/sdk'

// Same compact popover shape as LandingPageShareMenu.tsx — Export and Version history are real,
// backend-complete V1 capabilities (GET /landing-pages/{id}/export, GET .../versions) that had
// routed pages generated for them but were never actually linked into the editor anywhere, so
// they were undiscoverable. This is that missing entry point, not a new feature.
export function LandingPageMoreMenu({
  landingPageId,
  onVersions,
}: {
  landingPageId: string
  onVersions: () => void
}) {
  const [open, setOpen] = useState(false)
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      const client = getApiClient()
      const { data, error } = await client.GET('/landing-pages/{landingPageId}/export', {
        params: { path: { landingPageId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Export failed')
      return data!.data!
    },
    onSuccess: (result) => {
      // Real file download: build a Blob from the actual returned HTML and trigger it via a
      // throwaway <a download> element — the standard browser mechanism, not a fake success
      // toast with nothing behind it.
      const blob = new Blob([result.html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Page exported')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not export this page.')
    },
  })

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-45'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label="More page actions"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input-border bg-transparent text-foreground transition-colors hover:border-foreground/20 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal size={15} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="More page actions"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <button
            type="button"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
            className={itemClass}
          >
            <Download size={15} aria-hidden="true" />
            {exportMutation.isPending ? 'Exporting…' : 'Export HTML'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onVersions()
            }}
            className={itemClass}
          >
            <History size={15} aria-hidden="true" />
            Version history
          </button>
        </div>
      ) : null}
    </div>
  )
}
