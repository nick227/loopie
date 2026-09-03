import { cn } from '@/lib/utils'

export type EntityTab<K extends string> = { key: K; label: string }

// Entity-local sections (docs/strategy/03-product-principles.md's "Singleton, Collection, Entity"
// grammar): different views of one already-focused object, not global destinations — local
// component state, not routes, so this never needs its own entry in the conditional-chrome
// route table. Rounded-full pills match the design-language spec's observed "tab pills" treatment
// (docs/design/00-design-language-spec.md), not the squarer Button used for InboxFeed's filter.
export function EntityTabs<K extends string>({
  tabs,
  active,
  onChange,
  compact = false,
}: {
  tabs: EntityTab<K>[]
  active: K
  onChange: (key: K) => void
  compact?: boolean
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex flex-wrap',
        compact
          ? 'shrink-0 gap-0.5 rounded-lg bg-muted/70 p-0.5'
          : 'gap-1.5 border-b border-border pb-3',
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'font-medium transition-colors min-w-[110px]',
            compact ? 'rounded-md px-2.5 py-1.5 text-xs' : 'rounded-full px-3.5 py-1.5 text-sm',
            active === tab.key
              ? compact
                ? 'bg-background text-foreground shadow-sm'
                : 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
