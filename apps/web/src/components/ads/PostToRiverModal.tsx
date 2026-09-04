import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCreateRiverPost } from '@project/sdk'

// Companion to EmbedModal — same isOpen/onClose/objectId shape, a separate distribution surface
// (organic River post, not an embeddable object). Posts are immutable once created (see
// RiverPostService#create — no update operation), so this modal is create-only: no edit state.
export function PostToRiverModal({
  isOpen,
  onClose,
  advertisementId,
}: {
  isOpen: boolean
  onClose: () => void
  advertisementId: string
}) {
  const [body, setBody] = useState('')
  const { mutate, data: post, isPending, error, reset } = useCreateRiverPost()

  function handleClose() {
    setBody('')
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal title="Post to River" onClose={handleClose}>
      <div className="p-5 sm:p-6 flex flex-col min-h-[200px] max-w-lg mx-auto">
        {!post && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Publish this advertisement as an organic post on River, LOOPIE&rsquo;s B2B feed.
              Anyone can see it at your post&rsquo;s permalink without an account.
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Say something about this ad…"
              rows={4}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle size={14} /> {error.message}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => mutate({ type: 'AD', advertisementId, body })}
                disabled={isPending || !body.trim()}
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : null} Post
              </Button>
            </div>
          </>
        )}

        {post && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            <p className="text-base font-medium">Posted to River</p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
