import { Link } from 'react-router-dom'
import { Mail, MessageSquare, Share2 } from 'lucide-react'
import { useMessages } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { relativeTime } from '@/components/home/homeFormat'

const CHANNEL_ICON: Record<string, typeof Mail> = {
  EMAIL: Mail,
  TEXT: MessageSquare,
  SOCIAL: Share2,
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SCHEDULED: 'bg-info/10 text-info',
  SENT: 'bg-success/10 text-success',
  FAILED: 'bg-destructive/10 text-destructive',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
}

function messageLabel(subject: string | null | undefined, body: string): string {
  const clean = subject?.trim() || body.replace(/\s+/g, ' ').trim()
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean || 'Untitled message'
}

// Replaces the old broad "Recent response" activity feed (every Inbox thread type — contact
// replies, ad/page system notices, integration sync events) with something scoped to what this
// section is actually named for: real Messages, three at most, plus a real weekly count. The
// full cross-surface activity feed wasn't wrong data, just too much of it in a section meant to
// summarize, not list — Messages already has its own real, filterable list at /messages.
export function MessageSummary() {
  const query = useMessages({ limit: 3 })
  const messages = query.data?.pages?.[0]?.data ?? []

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Messages</h2>
        <Link
          to="/messages"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {query.isLoading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          Messages could not be loaded.{' '}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={Mail}
            title="No messages yet"
            description="Compose one to reach an audience."
          />
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border">
          {messages.map((message) => {
            const Icon = CHANNEL_ICON[message.channel] ?? Mail
            return (
              <Link
                key={message.id}
                to={`/messages/${message.id}`}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {messageLabel(message.subject, message.body)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_STYLE[message.status] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {STATUS_LABEL[message.status] ?? message.status}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(message.sentAt ?? message.scheduledAt ?? message.createdAt)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
