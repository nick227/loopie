import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { List, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlatMessageListProps {
  items: Array<{
    id: string
    channel?: string
    status?: string
    contactId?: string
    createdAt?: string
    subject?: string | null
    body?: string
  }>
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

export function FlatMessageList({
  items,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: FlatMessageListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={List}
        title="Inbox is empty"
        description="Your messages will appear here."
      />
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        // Dummy data parsing based on typical message fields
        const isEmail = item.channel === 'EMAIL' || !item.channel
        const ChannelIcon = isEmail ? Mail : MessageSquare
        const isUnread = item.status === 'UNREAD'

        return (
          <div
            key={item.id}
            className={cn(
              'group relative flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors hover:bg-muted/50 border border-transparent',
              isUnread ? 'bg-muted/20 border-border/50' : '',
            )}
          >
            <div className="flex-none">
              <div
                className={cn(
                  'rounded-full p-2',
                  isEmail ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500',
                )}
              >
                <ChannelIcon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'truncate text-sm',
                    isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                  )}
                >
                  {item.contactId || 'Unknown Sender'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : 'Date unavailable'}
                </span>
              </div>
              <span
                className={cn(
                  'truncate text-sm',
                  isUnread ? 'font-medium text-foreground/90' : 'text-muted-foreground',
                )}
              >
                {item.subject || item.body || 'No subject'}
              </span>
            </div>
          </div>
        )
      })}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
