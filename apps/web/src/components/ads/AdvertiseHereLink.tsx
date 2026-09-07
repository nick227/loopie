import { useId, useRef, useState, type FormEvent } from 'react'
import { useCreateSiteInquiry, useCurrentUser } from '@project/sdk'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export function AdvertiseHereLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('Interested in advertising!')
  const submission = useRef<{ key: string; payload: string } | null>(null)
  const submitting = useRef(false)
  const id = useId()
  const { data: me } = useCurrentUser()
  const inquiry = useCreateSiteInquiry()

  function showForm() {
    setName(me?.data.businessName ?? '')
    setEmail(me?.data.email ?? '')
    setMessage('Interested in advertising!')
    submission.current = null
    inquiry.reset()
    setOpen(true)
  }

  function close() {
    if (!submitting.current) setOpen(false)
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || !name.trim() || !email.trim() || !message.trim()) return
    const body = { name: name.trim(), email: email.trim(), message: message.trim() }
    const payload = JSON.stringify(body)
    if (submission.current?.payload !== payload) {
      submission.current = { key: crypto.randomUUID(), payload }
    }
    submitting.current = true
    try {
      await inquiry.mutateAsync({ ...body, submissionKey: submission.current.key })
    } catch {
      // Keep the draft and submission key so a failed or interrupted request can be retried.
    } finally {
      submitting.current = false
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={showForm}
        className={cn(
          'text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground',
          className,
        )}
      >
        Advertise here
      </button>
      {open && (
        <Modal title="Advertise here" onClose={close}>
          {inquiry.isSuccess ? (
            <div className="space-y-4 p-6">
              <div role="status">
                <p className="font-medium">Thanks! We’ve received your message.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Our team will get back to you at {email.trim()}.
                </p>
              </div>
              <Button onClick={close}>Done</Button>
            </div>
          ) : (
            <form onSubmit={send} className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">
                Tell us a little about what you have in mind. We’d love to help.
              </p>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-name`} className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={inquiry.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-email`} className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inquiry.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-message`} className="text-sm font-medium">
                  Message
                </label>
                <textarea
                  id={`${id}-message`}
                  name="message"
                  required
                  maxLength={5000}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={inquiry.isPending}
                  className="w-full rounded-lg border border-input-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {inquiry.isError && (
                <p role="alert" className="text-sm text-destructive">
                  We couldn’t send your message. Please try again.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={inquiry.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inquiry.isPending || !name.trim() || !email.trim() || !message.trim()}
                >
                  {inquiry.isPending ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
