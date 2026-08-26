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
    <div className="flex flex-col sm:flex-row gap-3 items-center bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex-1 w-full">
        <Input value={q} onChange={(e) => onQ(e.target.value)} placeholder="Search media" />
      </div>
      <div className="flex gap-1 w-full sm:w-auto">
        {[
          { value: '', label: 'All' },
          ...MEDIA_TYPES.map((value) => ({
            value,
            label: value.slice(0, 1) + value.slice(1).toLowerCase(),
          })),
        ].map((row) => (
          <button
            key={row.value || 'all'}
            type="button"
            onClick={() => onType(row.value as MediaTypeFilter)}
            className={`px-2.5 py-1.5 text-xs rounded-md ${
              type === row.value
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {row.label}
          </button>
        ))}
      </div>
    </div>
  )
}
