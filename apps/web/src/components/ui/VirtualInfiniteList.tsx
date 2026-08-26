import React, { useEffect, useRef } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'

export interface VirtualInfiniteListProps<T> {
  items: T[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
}

export function VirtualInfiniteList<T>({
  items,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  renderItem,
  estimateSize = 100,
}: VirtualInfiniteListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  const virtualizer = useWindowVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,
    estimateSize: () => estimateSize,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse()
    if (!lastItem) return

    if (lastItem.index >= items.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, fetchNextPage, items.length, isFetchingNextPage, virtualItems])

  return (
    <div
      ref={listRef}
      style={{
        height: virtualizer.getTotalSize(),
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualItem) => {
        const isLoaderRow = virtualItem.index > items.length - 1
        const item = items[virtualItem.index]

        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
              paddingBottom: '12px', // gap equivalent
            }}
          >
            {isLoaderRow || !item ? (
              <div className="text-center py-4 text-sm text-muted-foreground animate-pulse">
                Loading more...
              </div>
            ) : (
              renderItem(item, virtualItem.index)
            )}
          </div>
        )
      })}
    </div>
  )
}
