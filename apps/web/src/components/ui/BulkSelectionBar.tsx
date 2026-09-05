import { Button } from '@/components/ui/Button'

export function BulkSelectionBar({
  count,
  totalVisible,
  noun,
  deleting,
  onSelectAll,
  onClear,
  onDelete,
}: {
  count: number
  totalVisible: number
  noun: string
  deleting?: boolean
  onSelectAll: () => void
  onClear: () => void
  onDelete: () => void
}) {
  if (count === 0) return null

  const label = count === 1 ? noun : `${noun}s`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3">
      <p className="text-sm text-foreground">
        <span className="font-medium tabular-nums">{count}</span> {label} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {count < totalVisible ? (
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAll}>
            Select all {totalVisible}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button type="button" variant="destructive" size="sm" loading={deleting} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}
