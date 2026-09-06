import { useListTeamAuditEvents, type components } from '@project/sdk'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { UniversalRow } from '@/components/ui/UniversalRow'

type AuditEvent = components['schemas']['AuditEvent']

export function BusinessAuditPage() {
  const query = useListTeamAuditEvents({ limit: 50 }, { keepPreviousData: true })
  const items =
    (query.data?.pages as { data: AuditEvent[] }[] | undefined)?.flatMap((page) => page.data) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Audit Log</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record of critical actions and team management events within your business.
        </p>
      </div>

      <VirtualInfiniteList
        items={items}
        hasNextPage={!!query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
        renderItem={(evt) => (
          <UniversalRow
            key={evt.id}
            title={evt.action}
            subtitle={evt.actorEmail}
            trailing={
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium">{evt.resourceType}</span>
              </div>
            }
            meta={[
              new Date(evt.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              }),
            ]}
          />
        )}
      />
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No audit events found.</p>
      )}
    </div>
  )
}
