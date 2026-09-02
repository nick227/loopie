import { Bell, Building2, Mail, MessageSquare, Smartphone } from 'lucide-react'
import type { components } from '@project/sdk'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { relativeTime } from '@/components/home/homeFormat'

type Thread = components['schemas']['InboxThreadSummary']

const KIND_ICON: Record<string, typeof Mail> = {
  SITE: MessageSquare,
  EMAIL: Mail,
  SMS: Smartphone,
  SYSTEM: Bell,
}

const TYPE_LABEL: Record<string, string> = {
  BUSINESS: 'Loopie message',
  CONTACT: 'Contact',
  ADVERTISEMENT: 'Advertisement',
  PAGE: 'Page',
  INTEGRATION: 'Integration',
  SYSTEM: 'System',
}

export function InboxThreadRow({ thread }: { thread: Thread }) {
  const Icon = KIND_ICON[thread.previewKind ?? ''] ?? Building2
  return (
    <UniversalRow
      href={`/inbox/${thread.id}`}
      state={{ from: 'Messages', fromTo: '/messages' }}
      density="comfortable"
      leadingShape="circle"
      accent={thread.unread ? 'primary' : undefined}
      leading={
        <span className="grid h-full w-full place-items-center bg-primary/10 text-primary">
          <Icon size={16} />
        </span>
      }
      title={thread.subject}
      subtitle={thread.previewBody ?? 'No messages yet'}
      meta={
        <>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {TYPE_LABEL[thread.type] ?? thread.type}
          </span>
          {thread.unread ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              New
            </span>
          ) : null}
        </>
      }
      trailing={relativeTime(thread.lastMessageAt)}
    />
  )
}
