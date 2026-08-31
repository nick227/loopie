import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActivityStream, useActivityCheckpoint } from '@project/sdk'
import type { components } from '@project/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  List,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { Button } from '@/components/ui/Button'

// Simple relative time formatter since date-fns isn't available
function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

const NOISY_TYPES = ['PAGE_VIEWED', 'AD_CLICK', 'SYNC_COMPLETED', 'AUTOMATION_SUCCESS']

type ActivityItem = components['schemas']['ActivityItem']

type RollupGroup = {
  isRollup: true
  id: string
  key: string
  type: string
  source: ActivityItem['source']
  windowStart: string
  windowEnd: string
  items: ActivityItem[]
}

type SingleRow = {
  isRollup: false
  id: string
  item: ActivityItem
  isChild?: boolean
  isRollupHeader?: false
}

type RollupHeaderRow = RollupGroup & { isRollupHeader: true }

type FlatRow = SingleRow | RollupHeaderRow

export function ActivityStream() {
  const [searchParams, setSearchParams] = useSearchParams()
  const inspectId = searchParams.get('inspect')

  // Track expanded rollups by their unique ID
  const [expandedRollups, setExpandedRollups] = useState<Set<string>>(new Set())

  const toggleRollup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedRollups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Extract filters from URL
  const params: Parameters<typeof useActivityStream>[0] = {}
  if (searchParams.get('source')) params.source = searchParams.get('source') ?? undefined
  if (searchParams.get('type')) params.type = searchParams.get('type') ?? undefined
  if (searchParams.get('needsAction') === 'true') params.needsAction = true

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivityStream(params)
  const rawItems = useFlatPages({ data })

  const checkpoint = useActivityCheckpoint()
  const queryClient = useQueryClient()

  const hasNewUpdates = (() => {
    if (!checkpoint.data?.latestObservedAt || rawItems.length === 0) return false
    const latestItemObserved = new Date(rawItems[0].observedAt).getTime()
    const checkpointTime = new Date(checkpoint.data.latestObservedAt).getTime()
    return checkpointTime > latestItemObserved
  })()

  // Presentation-only grouping logic
  const items = useMemo(() => {
    const result: (SingleRow | RollupGroup)[] = []
    let currentGroup: RollupGroup | null = null

    for (const item of rawItems) {
      if (item.attentionItem?.state === 'NEEDS_ACTION' || !NOISY_TYPES.includes(item.type)) {
        // Render individually
        result.push({ isRollup: false, id: item.id, item })
        currentGroup = null
        continue
      }

      let objectId = item.source.id
      if (item.type === 'AD_CLICK' || item.type === 'AD_ATTRIBUTION') {
        objectId = item.references?.adId || item.source.id
      } else if (item.type === 'PAGE_VIEWED') {
        objectId = item.references?.pageId || item.source.id
      } else if (item.type === 'AUTOMATION_SUCCESS') {
        objectId = item.references?.runId || item.source.id
      }

      // We use the hour of occurrence as part of the key
      const hour = new Date(item.occurredAt).toISOString().slice(0, 13) // "2026-08-27T21"
      const aggKey = `${item.source.label}-${item.type}-${objectId}-${hour}`

      // Items are sorted DESC by occurredAt
      if (currentGroup && currentGroup.key === aggKey) {
        currentGroup.items.push(item)
        currentGroup.windowEnd = item.occurredAt
      } else {
        currentGroup = {
          isRollup: true,
          id: `rollup-${item.id}`, // use oldest item's ID as seed
          key: aggKey,
          type: item.type,
          source: item.source,
          windowStart: item.occurredAt,
          windowEnd: item.occurredAt,
          items: [item],
        }
        result.push(currentGroup)
      }
    }

    // Flatten expanded rollups back into the stream for VirtualInfiniteList to render sequentially
    const flattened: FlatRow[] = []
    for (const group of result) {
      if (group.isRollup) {
        if (group.items.length > 1) {
          flattened.push({ ...group, isRollupHeader: true })
          if (expandedRollups.has(group.id)) {
            // Add children underneath
            for (const child of group.items) {
              flattened.push({ isRollup: false, id: child.id, item: child, isChild: true })
            }
          }
        } else {
          // Just render as a single item if there's only 1
          const only = group.items[0]
          if (only) flattened.push({ isRollup: false, id: only.id, item: only })
        }
      } else {
        flattened.push(group)
      }
    }

    return flattened
  }, [rawItems, expandedRollups])

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )

  return (
    <div className="space-y-3 relative">
      {hasNewUpdates && (
        <div className="sticky top-0 z-10 flex justify-center pb-2 pt-2 -mt-2 bg-background/80 backdrop-blur">
          <Button
            size="sm"
            className="rounded-full shadow-md"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['activity', 'stream'] })}
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            New updates available
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={List}
          title="No activity yet"
          description="Try adjusting your filters or check back later."
        />
      ) : (
        <VirtualInfiniteList
          items={items}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          renderItem={(row) => {
            if (row.isRollupHeader) {
              const isExpanded = expandedRollups.has(row.id)
              return (
                <Card
                  key={row.id}
                  className="bg-muted/30 border-dashed cursor-pointer"
                  onClick={(e) => toggleRollup(row.id, e)}
                >
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <div className="text-sm">
                        <span className="font-semibold text-foreground uppercase tracking-wider text-xs">
                          {row.source.label} &middot; {row.type}
                        </span>
                        <span className="ml-2">— {row.items.length} similar events</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(row.windowStart)}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 mr-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 mr-1" />
                        )}
                        {isExpanded ? 'Hide' : 'Expand'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            const item = row.item
            const needsAction = item.attentionItem?.state === 'NEEDS_ACTION'
            const isSelected = item.id === inspectId

            return (
              <Card
                key={row.id}
                className={`cursor-pointer transition-colors ${row.isChild ? 'ml-6 bg-muted/10 border-l-2' : ''} ${isSelected ? 'ring-2 ring-primary bg-muted/50' : 'hover:bg-muted/50'} ${needsAction ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.set('inspect', item.id)
                  setSearchParams(next)
                }}
              >
                <CardContent className="py-4 flex items-start gap-4">
                  <div className="mt-1">
                    {needsAction ? (
                      <AlertCircle className="w-5 h-5 text-primary" />
                    ) : item.attention === 'INFORMATION' ? (
                      <Info className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-medium truncate">{item.summary}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.occurredAt)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 truncate">
                      <span className="uppercase tracking-wider font-semibold">
                        {item.source.label}
                      </span>
                      <span>&middot;</span>
                      <span>{item.type}</span>
                      {item.actor?.label && (
                        <>
                          <span>&middot;</span>
                          <span>By {item.actor.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }}
        />
      )}
    </div>
  )
}
