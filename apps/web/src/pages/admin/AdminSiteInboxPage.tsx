import { useSetSiteInboxSubscription, useSiteInbox } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function AdminSiteInboxPage() {
  const inbox = useSiteInbox()
  const subscription = useSetSiteInboxSubscription()
  const items = inbox.data?.pages.flatMap((page) => page.data) ?? []
  const subscribed = subscription.data?.enabled ?? inbox.data?.pages[0]?.emailNotifications ?? true

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Site inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Advertising inquiries shared with all site staff.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={subscribed}
          disabled={!inbox.data || subscription.isPending}
          onChange={(event) => subscription.mutate(event.target.checked)}
        />
        Email me when a new inquiry arrives
      </label>
      {subscription.isError && (
        <p role="alert" className="text-sm text-destructive">
          {subscription.error.message}
        </p>
      )}
      {inbox.isPending && <p role="status">Loading inquiries…</p>}
      {inbox.isError && (
        <div role="alert">
          <p>{inbox.error.message}</p>
          <Button variant="outline" onClick={() => void inbox.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {inbox.isSuccess && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No inquiries yet. New messages will appear here.
        </p>
      )}
      {items.map((item) => (
        <article key={item.id} className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <h3 className="font-medium">{item.name}</h3>
            <a className="text-sm underline underline-offset-4" href={`mailto:${item.email}`}>
              {item.email}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
            </p>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
        </article>
      ))}
      {inbox.hasNextPage && (
        <Button
          variant="outline"
          disabled={inbox.isFetchingNextPage}
          onClick={() => void inbox.fetchNextPage()}
        >
          {inbox.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
