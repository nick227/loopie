import { POST_TARGETS } from '@/lib/adPreview'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export function AdPostNow({
  mediaType,
  selected,
  budget,
  onToggle,
  onBudget,
}: {
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT' | undefined
  selected: string[]
  budget: number
  onToggle: (key: string) => void
  onBudget: (value: number) => void
}) {
  const targets = POST_TARGETS.filter((row) => !mediaType || row.types.includes(mediaType))

  if (targets.length === 0) return null

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Post now</p>
        <p className="text-sm text-muted-foreground">Pick where this goes live after save.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {targets.map((row) => {
          const on = selected.includes(row.key)
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => onToggle(row.key)}
              className={cn(
                'rounded-lg border px-3 py-3 text-left text-sm',
                on
                  ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-border',
              )}
            >
              {row.label}
            </button>
          )
        })}
      </div>
      {selected.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Daily budget (USD)</span>
          <Input
            type="number"
            min={1}
            value={budget}
            onChange={(event) => onBudget(Number(event.target.value))}
          />
        </label>
      ) : null}
    </div>
  )
}
