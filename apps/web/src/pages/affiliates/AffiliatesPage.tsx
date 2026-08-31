import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Search } from 'lucide-react'
import { useAffiliates } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { UniversalRow, UniversalRowList } from '@/components/ui/UniversalRow'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { rateLabel } from '@/components/affiliates/AffiliateRow'
import { ConnectStatusBadge } from '@/components/affiliates/ConnectStatusBadge'
import { formatUsd } from '@/lib/money'
import { Handshake, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function AffiliatesPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const query = useAffiliates()
  let items = useFlatPages(query)
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query

  if (q) {
    items = items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()))
  }
  if (status === 'ACTIVE') {
    items = items.filter((item) => item.isActive)
  } else if (status === 'PAUSED') {
    items = items.filter((item) => !item.isActive)
  }

  const statuses = ['ACTIVE', 'PAUSED']

  if (query.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-3">
      <PageHeader
        variant="list"
        title="Affiliates"
        primaryAction={
          <Link
            to="/affiliates/new"
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={14} /> New
          </Link>
        }
      />
      <AffiliateNav />

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="relative w-full">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search affiliates..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus('')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
              status === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-input-border hover:border-border',
            )}
          >
            All statuses
          </button>
          {statuses.map((value) => {
            const isSelected = status === value
            const hasResults = items.some((item) =>
              value === 'ACTIVE' ? item.isActive : !item.isActive,
            )
            const isDisabled = !hasResults && !isSelected && status === ''

            return (
              <button
                key={value}
                onClick={() => setStatus(value)}
                disabled={isDisabled}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-input-border hover:border-border',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </button>
            )
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No affiliates yet"
          description="Create a class and deal first, then add affiliates."
        />
      ) : (
        <UniversalRowList>
          <VirtualInfiniteList
            items={items}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            estimateSize={72}
            renderItem={(item) => (
              <UniversalRow
                href={`/affiliates/${item.id}`}
                leadingShape="circle"
                leading={
                  <span className="grid h-full w-full place-items-center bg-primary/10 text-xs font-semibold text-primary">
                    {initials(item.name)}
                  </span>
                }
                title={item.name}
                subtitle={`${item.className ?? 'No class'}${item.managerName ? ` · ${item.managerName}` : ''}${item.isActive ? '' : ' · Paused'}`}
                meta={<ConnectStatusBadge status={item.connectStatus} />}
                trailing={
                  <>
                    <div>{rateLabel(item.commissionRateBps, item.commissionRuleType)}</div>
                    <div>
                      {item.payableMinor > 0
                        ? `${formatUsd(item.payableMinor)} payable`
                        : `${formatUsd(item.pendingMinor)} pending`}
                    </div>
                  </>
                }
              />
            )}
          />
        </UniversalRowList>
      )}
    </div>
  )
}
