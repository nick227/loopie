import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSendBusinessProfileMessage } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

export function BusinessMessageDrawer({
  open,
  onClose,
  businessName,
  slug,
  senderName,
  senderPending = false,
}: {
  open: boolean
  onClose: () => void
  businessName: string
  slug: string
  senderName?: string
  senderPending?: boolean
}) {
  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const send = useSendBusinessProfileMessage()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 80)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !send.isPending) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose, send.isPending])

  if (!open) return null

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const message = body.trim()
    if (!message) return
    try {
      await send.mutateAsync({ slug, body: message })
      setBody('')
      onClose()
      toast.success(`Message sent to ${businessName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Message could not be sent')
    }
  }

  const loginHref = `/login?returnTo=${encodeURIComponent(`/b/${slug}`)}`

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close message composer"
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={send.isPending ? undefined : onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-message-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300"
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              <Mail size={17} />
            </div>
            <div>
              <h2 id="business-message-title" className="font-semibold text-foreground">
                Message {businessName}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Delivered to their Loopie inbox
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            disabled={send.isPending}
          >
            <X size={18} />
          </Button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col p-6">
          <p className="mb-3 text-xs text-muted-foreground">
            {senderPending ? (
              <>Checking your sending identity…</>
            ) : senderName ? (
              <>
                Sending as <span className="font-medium text-foreground">{senderName}</span>
              </>
            ) : (
              <>
                Sending as <span className="font-medium text-foreground">guest</span>
                {' · '}
                <Link
                  to={loginHref}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Log in
                </Link>{' '}
                to start a replyable conversation
              </>
            )}
          </p>
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Write a message to ${businessName}…`}
            maxLength={4000}
            className="min-h-[220px] flex-1 resize-none"
            disabled={send.isPending}
            aria-label="Message"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {body.length}/4000
            </span>
            <Button type="submit" loading={send.isPending} disabled={senderPending || !body.trim()}>
              Send message <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}
