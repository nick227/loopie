import { Avatar } from '@/components/ui/Avatar'
import { AdMiniVisual } from './visuals/AdMiniVisual'

/**
 * The hero's right-column visual: one coherent product panel, not several floating cards. It
 * layers three real workflow pieces inside a single frame — an ad, the lead it produced, and the
 * follow-up task that lead creates — the same sequence the product itself connects end to end.
 */
export function HeroProductComposition() {
  return (
    <div className="hidden lg:block" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="p-6">
          <AdMiniVisual className="max-w-none" />
        </div>

        <div className="flex items-center gap-3 border-t border-border px-6 py-5">
          <Avatar name="Jordan Casey" size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Jordan Casey</p>
            <p className="truncate text-xs text-muted-foreground">New lead · Website form</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            New
          </span>
        </div>

        <div className="flex items-center gap-3 border-t border-border px-6 py-5">
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border-2 border-primary"
          />
          <p className="min-w-0 flex-1 truncate text-sm text-foreground">
            Follow up with Jordan Casey
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  )
}
