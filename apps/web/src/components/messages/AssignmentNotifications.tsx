import { Link } from 'react-router-dom'
import { useAssignmentNotifications, useReadAssignmentNotification } from '@project/sdk'
import { toast } from 'sonner'

export function AssignmentNotifications() {
  const query = useAssignmentNotifications()
  const read = useReadAssignmentNotification()
  return (
    <section aria-labelledby="assignments-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="assignments-heading" className="text-sm font-semibold">
          Your assignments
        </h2>
        {!!query.data?.unreadCount && (
          <span className="text-xs text-primary">{query.data.unreadCount} unread</span>
        )}
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading assignments…</p>
      ) : query.isError ? (
        <button onClick={() => query.refetch()} className="text-sm underline">
          Could not load assignments. Retry
        </button>
      ) : !query.data?.data.length ? (
        <p className="text-sm text-muted-foreground">
          When a teammate assigns you a task, it will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {query.data.data.map((notice) => {
            const date = notice.scheduledFor
              ? new Date(notice.scheduledFor).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  ...(notice.hasTime ? ({ hour: 'numeric', minute: '2-digit' } as const) : {}),
                })
              : 'Unscheduled'
            const params = new URLSearchParams({ goal: notice.goalId })
            if (notice.taskScheduledFor) params.set('date', notice.taskScheduledFor)
            return (
              <li key={notice.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <Link
                  to={`/calendar?${params}`}
                  className="min-w-0 hover:underline"
                  onClick={() => {
                    if (!notice.readAt)
                      read.mutate(notice.id, {
                        onError: () => toast.error('Could not mark assignment read'),
                      })
                  }}
                >
                  <span className={!notice.readAt ? 'font-semibold' : ''}>
                    {notice.actorLabel} assigned you “{notice.taskTitle}”
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {date}
                    {notice.estimateMinutes != null ? ` · est. ${notice.estimateMinutes}m` : ''}
                  </span>
                </Link>
                {!notice.readAt && (
                  <button
                    type="button"
                    disabled={read.isPending}
                    className="shrink-0 text-xs text-muted-foreground hover:underline"
                    onClick={() =>
                      read.mutate(notice.id, {
                        onError: () => toast.error('Could not mark assignment read'),
                      })
                    }
                  >
                    Mark read
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
