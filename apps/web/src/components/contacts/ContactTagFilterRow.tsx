import { useContactTags, type ContactTagColor } from '@project/sdk'
import { TAG_COLOR_DOT } from '@/lib/tagColors'
import { cn } from '@/lib/utils'

// Multi-tag filter for the Contacts collection — a row of toggleable chips (not a <select>, since
// SearchFilterBar's generic filter slot is single-value) plus an explicit Any/All toggle once 2+
// tags are selected, per the product decision: default AND ("has all"), never an ambiguous
// implicit OR, and the toggle only appears once it's actually a meaningful choice.
export function ContactTagFilterRow({
  selectedIds,
  mode,
  onChange,
  onModeChange,
}: {
  selectedIds: string[]
  mode: 'AND' | 'OR'
  onChange: (ids: string[]) => void
  onModeChange: (mode: 'AND' | 'OR') => void
}) {
  const query = useContactTags()
  const tags = query.data?.data ?? []
  if (tags.length === 0) return null

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((t) => t !== id) : [...selectedIds, id])
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const active = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-foreground/30 bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                active ? 'bg-background' : TAG_COLOR_DOT[tag.color as ContactTagColor],
              )}
            />
            {tag.name}
          </button>
        )
      })}
      {selectedIds.length > 1 ? (
        <div className="ml-1 inline-flex rounded-full border border-border p-0.5 text-xs">
          {(['AND', 'OR'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              className={cn(
                'rounded-full px-2 py-0.5 font-medium transition-colors',
                mode === value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'AND' ? 'All' : 'Any'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
