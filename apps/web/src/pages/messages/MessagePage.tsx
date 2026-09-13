import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Send as SendIcon, Trash2, BarChart2 } from 'lucide-react'
import { useAudience, useDeleteMessage, useMessage } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePageTitle } from '@/lib/headerContext'
import { apiErrorMessage } from '@/lib/apiError'
import { relativeTime } from '@/components/home/homeFormat'
import {
  CHANNEL_ICON,
  CHANNEL_LABEL,
  STATUS,
  STATUS_STYLE,
  bodyPreview,
} from '@/components/messages/MessageRow'

function AudienceSummary({ audienceId }: { audienceId: string }) {
  const { data, isLoading } = useAudience(audienceId)
  const audience = data?.data
  if (isLoading) return <Skeleton className="h-5 w-40" />
  if (!audience) return <p className="text-muted-foreground">Audience not found.</p>
  return (
    <Link
      to={`/audiences/${audienceId}`}
      className="font-medium hover:underline underline-offset-4"
    >
      {audience.name}
    </Link>
  )
}

export function MessagePage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useMessage(messageId!)
  const deleteMessage = useDeleteMessage()
  const message = data?.data

  usePageTitle(message ? 'Message' : null)

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (!message) return <p className="text-muted-foreground">Not found.</p>

  const Icon = CHANNEL_ICON[message.channel] ?? CHANNEL_ICON.EMAIL!
  const hasSubject = Boolean(message.subject?.trim())
  const title = hasSubject ? message.subject! : bodyPreview(message.body) || 'Untitled message'
  const canEdit = message.status !== 'SENT'
  const canSend = message.status !== 'SENT'
  const canDelete = message.status !== 'SENT'

  async function onDelete() {
    if (!confirm('Delete this message? This cannot be undone.')) return
    try {
      await deleteMessage.mutateAsync(messageId!)
      toast.success('Message deleted')
      navigate('/messages')
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete this message.'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Icon size={20} className="text-primary" />
            {title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_STYLE[message.status] ?? 'bg-muted text-muted-foreground'}`}
            >
              {STATUS[message.status] ?? message.status}
            </span>
            <span>{CHANNEL_LABEL[message.channel] ?? message.channel}</span>
            <span>·</span>
            <span>
              {message.status === 'SENT' && message.sentAt
                ? `Sent ${relativeTime(message.sentAt)}`
                : message.status === 'SCHEDULED' && message.scheduledAt
                  ? `Scheduled ${relativeTime(message.scheduledAt)}`
                  : `Created ${relativeTime(message.createdAt)}`}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {canEdit ? (
            <Link to={`/messages/${message.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil size={13} /> Edit
              </Button>
            </Link>
          ) : null}
          {canSend ? (
            <Link to={`/messages/${message.id}/send`}>
              <Button size="sm">
                <SendIcon size={13} /> {message.channel === 'SOCIAL' ? 'Mark as Posted' : 'Send'}
              </Button>
            </Link>
          ) : null}
          {message.status === 'SENT' ? (
            <Link to={`/messages/${message.id}/performance`}>
              <Button variant="outline" size="sm">
                <BarChart2 size={13} /> Performance
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Audience</p>
            <div className="flex items-center gap-2">
              <AudienceSummary audienceId={message.audienceId} />
              <span className="text-muted-foreground">
                · {message.recipientCount} recipient{message.recipientCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {hasSubject ? (
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">{message.subject}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">Body</p>
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
        </CardContent>
      </Card>

      {canDelete ? (
        <Button
          variant="destructive"
          size="sm"
          loading={deleteMessage.isPending}
          onClick={onDelete}
        >
          <Trash2 size={13} /> Delete message
        </Button>
      ) : null}

      <Button variant="ghost" size="sm" onClick={() => navigate('/messages')}>
        Back to messages
      </Button>
    </div>
  )
}
