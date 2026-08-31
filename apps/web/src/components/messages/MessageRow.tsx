import { Mail, MessageSquare, Share2 } from 'lucide-react'
import type { components } from '@project/sdk'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { relativeTime } from '@/components/home/homeFormat'

type Message = components['schemas']['Message']

const CHANNEL_ICON: Record<string, typeof Mail> = {
  EMAIL: Mail,
  TEXT: MessageSquare,
  SOCIAL: Share2,
}
const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: 'Email',
  TEXT: 'Text',
  SOCIAL: 'Social',
}

const STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
}

// Same tint-pair status-pill convention as AdRow/PageRow — sent is the positive/complete state,
// failed is destructive, scheduled/draft stay neutral (nothing has happened yet).
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SCHEDULED: 'bg-info/10 text-info',
  SENT: 'bg-success/10 text-success',
  FAILED: 'bg-destructive/10 text-destructive',
}

function bodyPreview(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat
}

function timeMeta(message: Message): string | null {
  if (message.status === 'SENT' && message.sentAt) return `Sent ${relativeTime(message.sentAt)}`
  if (message.status === 'SCHEDULED' && message.scheduledAt)
    return `Scheduled ${relativeTime(message.scheduledAt)}`
  return null
}

// Messages joins the same Universal Row grammar Pages/Advertising/Contacts already use — no
// visual thumbnail to feature (a conversation has no creative asset), so the "featured" preview
// slot is a large tinted channel-identity icon instead of a media crop, keeping row height/rhythm
// identical across all four collections while staying honest about what a message actually is.
export function MessageRow({ message }: { message: Message }) {
  const Icon = CHANNEL_ICON[message.channel] ?? Mail
  const time = timeMeta(message)
  const hasSubject = Boolean(message.subject?.trim())

  return (
    <UniversalRow
      density="featured"
      leadingShape="circle"
      href={`/messages/${message.id}`}
      state={{ from: 'Messages', fromTo: '/messages' }}
      leading={
        <div className="grid h-full w-full place-items-center bg-primary/10 text-primary">
          <Icon size={22} />
        </div>
      }
      title={hasSubject ? message.subject : bodyPreview(message.body) || 'Untitled message'}
      subtitle={hasSubject ? bodyPreview(message.body) : undefined}
      meta={
        <>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_STYLE[message.status] ?? 'bg-muted text-muted-foreground'}`}
          >
            {STATUS[message.status] ?? message.status}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {CHANNEL_LABEL[message.channel] ?? message.channel}
          </span>
          {message.recipientCount ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {message.recipientCount} recipient{message.recipientCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </>
      }
      trailing={time ?? `Created ${relativeTime(message.createdAt)}`}
    />
  )
}
