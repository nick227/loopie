import { useAdminListUsers, type operations } from '@project/sdk'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { ShieldAlert, ShieldCheck, User } from 'lucide-react'

type AdminUsersResponse =
  operations['adminListUsers']['responses']['200']['content']['application/json']
type AdminUser = AdminUsersResponse['data'][number]

export function AdminUsersPage() {
  const query = useAdminListUsers({ limit: 50 }, { keepPreviousData: true })
  const items =
    (query.data?.pages as AdminUsersResponse[] | undefined)?.flatMap((page) => page.data) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Users</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide catalog of all registered users.
        </p>
      </div>

      <VirtualInfiniteList
        items={items}
        hasNextPage={!!query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
        renderItem={(u: AdminUser) => {
          let Icon = User
          if (u.platformRole === 'SITE_ADMIN') Icon = ShieldAlert
          else if (u.platformRole === 'AFFILIATE') Icon = ShieldCheck

          const joinedBusinesses =
            u.businesses.length > 0
              ? u.businesses.map((b) => b.name).join(', ')
              : 'No business memberships'

          return (
            <UniversalRow
              key={u.id}
              leading={<Icon className="h-5 w-5 text-muted-foreground" />}
              title={u.email}
              subtitle={joinedBusinesses}
              trailing={<span className="text-sm">{u.platformRole}</span>}
              meta={[
                new Date(u.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              ]}
            />
          )
        }}
      />
      {items.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
    </div>
  )
}
