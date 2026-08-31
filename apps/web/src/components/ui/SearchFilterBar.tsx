import type { ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export interface SearchFilterBarSearch {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface SearchFilterBarOption {
  value: string
  label: string
}

export interface SearchFilterBarFilter {
  id: string
  label?: string
  value: string
  options: SearchFilterBarOption[]
  onChange: (value: string) => void
}

export interface SearchFilterBarProps {
  search?: SearchFilterBarSearch
  filters?: SearchFilterBarFilter[]
  trailing?: ReactNode
  className?: string
}

/**
 * Generic search + filter row shared by list pages. Deliberately not named
 * after any one domain (no CampaignSearchBar/AdFilterToolbar) — composes
 * into any list page that needs a search input plus zero or more selects.
 */
export function SearchFilterBar({
  search,
  filters = [],
  trailing,
  className,
}: SearchFilterBarProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 sm:flex-row', className)}>
      {search ? (
        <div className="relative w-full flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder}
            className="bg-muted border-border pl-9"
          />
        </div>
      ) : null}

      {filters.map((filter) => (
        <div key={filter.id} className="relative w-full shrink-0 sm:w-48">
          <select
            aria-label={filter.label ?? filter.id}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            className="h-10 w-full appearance-none rounded-md border border-border bg-muted pr-8 pl-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
        </div>
      ))}

      {trailing ? (
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{trailing}</div>
      ) : null}
    </div>
  )
}
