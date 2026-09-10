import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'
import { RiverComposerModal } from '@/components/river/RiverComposerModal'

/**
 * The global Create action — persistent, not a root nav item (see
 * docs/strategy/03-product-principles.md's "Global Creation Model"). Real current creation flows:
 * Message, Page, Ad, River post (slice 6 — the first general-purpose composer in the app; opens
 * its own modal rather than navigating, unlike the others). No Email/Social/Automation entries —
 * those aren't real standalone creation flows in this app yet (Message already covers email/SMS
 * via its own channel picker; Automation is explicitly not a Create-sheet item — see the
 * Automation section of that doc).
 */
export function CreateMenu({
  trigger,
}: {
  trigger: (props: { onClick: () => void }) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [riverComposerOpen, setRiverComposerOpen] = useState(false)
  const navigate = useNavigate()
  const quickCreatePage = useQuickCreatePage()
  const [pageError, setPageError] = useState<string | null>(null)

  const items = [
    {
      key: 'message',
      label: 'Message',
      onSelect: () => {
        setOpen(false)
        navigate('/messages/new')
      },
    },
    {
      key: 'page',
      label: 'Page',
      onSelect: async () => {
        setPageError(null)
        const result = await quickCreatePage.create()
        if (result.ok) setOpen(false)
        else setPageError(result.message)
      },
      pending: quickCreatePage.isPending,
    },
    {
      key: 'ad',
      label: 'Ad',
      onSelect: () => {
        setOpen(false)
        navigate('/ads/new')
      },
    },
    {
      key: 'river',
      label: 'Post',
      onSelect: () => {
        setOpen(false)
        setRiverComposerOpen(true)
      },
    },
  ]

  return (
    <>
      {trigger({ onClick: () => setOpen(true) })}
      {open ? (
        <Modal title="Create" onClose={() => setOpen(false)}>
          <div className="space-y-1 pb-2">
            {pageError ? (
              <p
                role="alert"
                className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive"
              >
                {pageError}
              </p>
            ) : null}
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.pending}
                onClick={() => void item.onSelect()}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {item.pending ? 'Creating…' : item.label}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
      <RiverComposerModal isOpen={riverComposerOpen} onClose={() => setRiverComposerOpen(false)} />
    </>
  )
}

/** A ready-made round primary trigger button, for the common case (Shell's sidebar/bottom nav). */
export function CreateButtonTrigger({
  onClick,
  compact,
}: {
  onClick: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Create"
        className="grid h-11 w-11 shrink-0 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Plus size={22} />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Create"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <Plus size={18} />
    </button>
  )
}
