import { cn } from '@/lib/utils'

export interface StatusTab {
  value: string
  label: string
  count?: number
}

export function StatusTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: StatusTab[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1 border-b border-border"
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              'h-8 border-b-2 px-2.5 text-xs font-medium transition-colors',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined ? ` (${tab.count})` : ''}
          </button>
        )
      })}
    </div>
  )
}
