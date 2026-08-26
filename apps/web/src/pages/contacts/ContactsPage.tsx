import { useState } from 'react'
import { useContacts } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { List } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'

export function ContactsPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useContacts(
    q ? { q } : undefined,
  )
  const items = useFlatPages({ data: data })

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Contacts</h1>

      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search contacts..."
        className="w-full"
      />
      {items.length === 0 ? (
        <EmptyState
          icon={List}
          title="Nothing here yet"
          description="Items will appear here once created."
        />
      ) : (
        <VirtualInfiniteList
          items={items}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          renderItem={(item: any) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                {/* TODO: replace with real fields */}
                <pre className="text-xs text-muted-foreground overflow-auto">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        />
      )}
    </div>
  )
}
