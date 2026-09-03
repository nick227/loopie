import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useInboxThread, useMarkInboxThreadRead, useReplyToInboxThread } from '@project/sdk'
import { MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'Text',
  SITE: 'Loopie',
  SYSTEM: 'System',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// A full-width, centered rule — the same pattern chat apps use to interrupt a conversation with a
// system notice ("Lead moved to Contacted") without pretending it's something either party said.
function SystemNotice({
  subject,
  body,
  at,
}: {
  subject: string | null | undefined
  body: string
  at: string
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <p className="shrink-0 text-center text-xs text-muted-foreground">
        {subject ?? body} <span className="text-muted-foreground/70">· {formatTime(at)}</span>
      </p>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function MessageBubble({
  direction,
  kind,
  subject,
  body,
  at,
}: {
  direction: string
  kind: string
  subject: string | null | undefined
  body: string
  at: string
}) {
  const outbound = direction === 'OUTBOUND'
  return (
    <div className={cn('flex flex-col gap-1', outbound ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          outbound
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {subject ? <p className="text-sm font-medium">{subject}</p> : null}
        <p className="whitespace-pre-wrap text-sm">{body}</p>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {KIND_LABEL[kind] ?? kind} · {outbound ? 'Sent' : 'Received'} · {formatTime(at)}
      </p>
    </div>
  )
}

// Object threads (ADVERTISEMENT/PAGE/INTEGRATION) have no back-and-forth — every message is a
// system event about that object. A plain chronological timeline (headline + detail + timestamp)
// reads truer than a chat bubble, which implies a conversation that isn't happening here.
function TimelineEntry({
  subject,
  body,
  at,
}: {
  subject: string | null | undefined
  body: string
  at: string
}) {
  return (
    <div className="flex gap-3 py-3">
      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">{subject ?? 'Update'}</p>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={at}>
            {formatTime(at)}
          </time>
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export function InboxThreadPage() {
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const { threadId } = useParams<{ threadId: string }>()
  const query = useInboxThread(threadId ?? '')
  const markRead = useMarkInboxThreadRead()
  const reply = useReplyToInboxThread()
  const thread = query.data?.data?.thread
  const messages = query.data?.data?.messages ?? []

  useEffect(() => {
    if (threadId && thread?.unread) markRead.mutate(threadId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, thread?.unread])

  if (query.isLoading) return <Skeleton className="mx-auto h-64 w-full max-w-2xl" />
  if (!thread) return <p className="text-center text-muted-foreground">Thread not found.</p>

  const sourceLink =
    thread.type === 'ADVERTISEMENT' && thread.advertisementId
      ? { to: `/ads/${thread.advertisementId}`, label: 'Open advertisement' }
      : thread.type === 'CONTACT' && thread.contactId
        ? { to: `/contacts/${thread.contactId}`, label: 'Open contact' }
        : thread.type === 'PAGE' && thread.landingPageId
          ? { to: `/landing-pages/${thread.landingPageId}`, label: 'Open page' }
          : thread.type === 'INTEGRATION'
            ? { to: '/platforms', label: 'Manage integrations' }
            : null

  const isConversation = thread.type === 'CONTACT' || thread.type === 'BUSINESS'

  async function sendReply(event: React.FormEvent) {
    event.preventDefault()
    const body = replyBody.trim()
    if (!body || !threadId) return
    try {
      await reply.mutateAsync({ threadId, body })
      setReplyBody('')
      setReplying(false)
      toast.success('Reply sent')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reply could not be sent')
    }
  }

  function openReply() {
    setReplying(true)
    window.setTimeout(() => replyRef.current?.focus(), 0)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <PageHeader
        variant="detail"
        title={thread.subject}
        breadcrumb={{ to: '/profile', label: 'Profile' }}
        secondaryActions={
          sourceLink ? (
            <Link
              to={sourceLink.to}
              state={{ from: 'Profile', fromTo: '/profile' }}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {sourceLink.label}
            </Link>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : isConversation ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          {messages.map((message) =>
            message.direction === 'INTERNAL' ? (
              <SystemNotice
                key={message.id}
                subject={message.subject}
                body={message.body}
                at={message.createdAt}
              />
            ) : (
              <MessageBubble
                key={message.id}
                direction={message.direction}
                kind={message.kind}
                subject={message.subject}
                body={message.body}
                at={message.createdAt}
              />
            ),
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border px-4">
          {messages.map((message) => (
            <TimelineEntry
              key={message.id}
              subject={message.subject}
              body={message.body}
              at={message.createdAt}
            />
          ))}
        </div>
      )}

      {thread.canReply ? (
        replying ? (
          <form onSubmit={sendReply} className="rounded-xl border border-border bg-surface/20 p-4">
            <label htmlFor="site-reply" className="mb-2 block text-sm font-medium">
              Reply to {thread.subject}
            </label>
            <Textarea
              id="site-reply"
              ref={replyRef}
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder="Write a reply…"
              maxLength={4000}
              disabled={reply.isPending}
              className="min-h-28"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {replyBody.length}/4000
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setReplying(false)}
                  disabled={reply.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={reply.isPending} disabled={!replyBody.trim()}>
                  <Send size={14} /> Reply
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <Button onClick={openReply} className="w-full sm:w-auto">
            <MessageCircle size={15} /> Reply
          </Button>
        )
      ) : null}
    </div>
  )
}
