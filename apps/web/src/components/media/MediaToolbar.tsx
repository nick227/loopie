import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'

export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'] as const
export type MediaTypeFilter = (typeof MEDIA_TYPES)[number] | ''

export function MediaToolbar({
  q,
  type,
  onQ,
  onType,
}: {
  q: string
  type: MediaTypeFilter
  onQ: (value: string) => void
  onType: (value: MediaTypeFilter) => void
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="relative w-full">
        <Input value={q} onChange={(e) => onQ(e.target.value)} placeholder="Search media..." />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onType('')}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
            type === ''
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent text-muted-foreground border-input-border hover:border-border',
          )}
        >
          All types
        </button>
        {MEDIA_TYPES.map((value) => {
          const isSelected = type === value
          // We don't have items array here to check for empty results, so we don't disable based on empty results
          return (
            <button
              key={value}
              onClick={() => onType(value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-input-border hover:border-border',
              )}
            >
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
