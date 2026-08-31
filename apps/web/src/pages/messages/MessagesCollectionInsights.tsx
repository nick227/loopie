import { Send, Clock, FileText, Users, Radio } from 'lucide-react'
import type { components } from '@project/sdk'
import { CollectionInsightsPanel } from '@/components/welcome/CollectionInsightsPanel'

type Message = components['schemas']['Message']

function messageLabel(message: Message): string {
  return message.subject?.trim() || message.body.trim().slice(0, 40) || 'Untitled message'
}

// Messages-specific highlights, replacing the generic cross-surface WelcomeSection on this
// collection — the same icon-tile metrics panel Pages/Advertising/Contacts use. Recipients
// reached is real, already-computed data (Message.recipientCount, summed across sent messages),
// not a fabricated open-rate/engagement number no provider in this codebase can back.
export function MessagesCollectionInsights({ messages }: { messages: Message[] }) {
  if (messages.length === 0) return null
  const sent = messages.filter((m) => m.status === 'SENT')
  const scheduled = messages.filter((m) => m.status === 'SCHEDULED').length
  const drafts = messages.filter((m) => m.status === 'DRAFT').length
  const recipientsReached = sent.reduce((sum, m) => sum + (m.recipientCount ?? 0), 0)
  const top = [...sent].sort((a, b) => (b.recipientCount ?? 0) - (a.recipientCount ?? 0))[0]
  const best = top && (top.recipientCount ?? 0) > 0 ? top : null

  return (
    <CollectionInsightsPanel
      stats={[
        { icon: Send, value: String(sent.length), label: 'sent' },
        { icon: Clock, value: String(scheduled), label: 'scheduled' },
        { icon: FileText, value: String(drafts), label: 'drafts' },
        { icon: Users, value: String(recipientsReached), label: 'recipients reached' },
      ]}
      highlight={
        best
          ? {
              icon: Radio,
              href: `/messages/${best.id}`,
              children: (
                <>
                  Widest reach:{' '}
                  <span className="font-medium text-foreground">{messageLabel(best)}</span> ·{' '}
                  {best.recipientCount} recipient{best.recipientCount === 1 ? '' : 's'}
                </>
              ),
            }
          : undefined
      }
    />
  )
}
