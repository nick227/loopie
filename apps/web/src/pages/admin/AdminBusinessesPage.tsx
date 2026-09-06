import { useAdminListBusinesses, type operations } from '@project/sdk'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { Link } from 'react-router-dom'

type AdminBusinessesResponse =
  operations['adminListBusinesses']['responses']['200']['content']['application/json']
type AdminBusiness = AdminBusinessesResponse['data'][number]

export function AdminBusinessesPage() {
  const query = useAdminListBusinesses({ limit: 50 }, { keepPreviousData: true })
  const items =
    (query.data?.pages as AdminBusinessesResponse[] | undefined)?.flatMap((page) => page.data) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Businesses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide catalog of all registered businesses.
        </p>
      </div>

      <VirtualInfiniteList
        items={items}
        hasNextPage={!!query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
        renderItem={(biz: AdminBusiness) => (
          <Link
            key={biz.id}
            to={`/admin/businesses/${biz.id}`}
            className="block hover:bg-muted/50 rounded-lg"
          >
            <UniversalRow
              title={biz.name}
              subtitle={biz.slug ? `@${biz.slug}` : 'No slug'}
              trailing={
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium">{biz.memberCount} Members</span>
                  <span className="text-xs text-muted-foreground">
                    {biz.ownerEmail ?? 'No owner'}
                  </span>
                </div>
              }
              meta={[
                new Date(biz.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              ]}
            />
          </Link>
        )}
      />
      {items.length === 0 && <p className="text-sm text-muted-foreground">No businesses found.</p>}
    </div>
  )
}
