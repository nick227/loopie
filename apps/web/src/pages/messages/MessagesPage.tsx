import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessages } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchFilterBar } from '@/components/ui/SearchFilterBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { UniversalRowList } from '@/components/ui/UniversalRow'
import { MessageRow } from '@/components/messages/MessageRow'
import { List, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { MessagesCollectionInsights } from './MessagesCollectionInsights'

const STATUSES = ['DRAFT', 'SCHEDULED', 'SENT', 'FAILED']
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
}

export function MessagesPage() {
  const navigate = useNavigate()
  const query = useMessages()
  const items = useFlatPages(query)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  // No server-side search on this endpoint (useMessages only takes status/channel) — client-side
  // filter on the already-fetched page, same fallback AdsPage uses for its own search field.
  let visible = items
  if (q) {
    const needle = q.toLowerCase()
    visible = visible.filter(
      (m) =>
        (m.subject ?? '').toLowerCase().includes(needle) || m.body.toLowerCase().includes(needle),
    )
  }
  if (status) {
    visible = visible.filter((m) => m.status === status)
  }

  return (
    <div className="space-y-6">
      <MessagesCollectionInsights messages={items} />

      <PageHeader
        variant="list"
        title="Messages"
        description="Draft, schedule, and review real message activity."
        primaryAction={
          <Button onClick={() => navigate('/messages/new')}>
            <Plus size={16} /> New message
          </Button>
        }
      />

      <SearchFilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search messages by subject or body...' }}
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: '', label: 'All statuses' },
              ...STATUSES.map((value) => ({ value, label: STATUS_LABEL[value]! })),
            ],
            onChange: setStatus,
          },
        ]}
      />

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
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
      ) : visible.length === 0 ? (
        <EmptyState
          icon={List}
          title={q || status ? 'No matching messages' : 'No messages yet'}
          description={
            q || status
              ? 'Clear a filter or try a different search.'
              : 'Create a message when you are ready to contact an audience.'
          }
          action={
            q || status
              ? undefined
              : { label: 'New message', onClick: () => navigate('/messages/new') }
          }
        />
      ) : (
        <UniversalRowList>
          {visible.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </UniversalRowList>
      )}
      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
