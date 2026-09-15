import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCalendarLinkCandidates } from '@project/sdk'
import type { LinkableSubjectType } from '../calendar.types'
import { LINK_TYPE_LABEL } from '../linkTypes'
import { X } from 'lucide-react'

const LINKABLE_TYPES: { value: LinkableSubjectType; label: string; searchLabel: string }[] = [
  { value: 'PAGE', label: 'Page', searchLabel: 'pages' },
  { value: 'ADVERTISEMENT', label: 'Ad', searchLabel: 'ads' },
  { value: 'MESSAGE', label: 'Message', searchLabel: 'messages' },
  { value: 'CRM', label: 'Contact', searchLabel: 'contacts' },
]

export type LinkValue = { subjectType: LinkableSubjectType; subjectId: string; label: string }

// "Linked to: [type] [record]" — a predictable two-step picker, deliberately not a single global
// search box. The type select narrows which of the 4 linkable record types is being searched; the
// record field is a type-scoped, debounce-free (queries are cheap, capped at 8 rows server-side)
// search-and-pick. Once a link is chosen it collapses to a compact chip with Open/Remove — see
// EditTaskRail for those two actions.
export function LinkPicker({
  value,
  onChange,
}: {
  value: LinkValue | null
  onChange: (value: LinkValue | null) => void
}) {
  const [pickingType, setPickingType] = useState<LinkableSubjectType | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const candidates = useCalendarLinkCandidates(pickingType, query)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs text-foreground">
          <span className="text-muted-foreground">{LINK_TYPE_LABEL[value.subjectType]} ·</span>{' '}
          {value.label}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove link"
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  const activeType = LINKABLE_TYPES.find((t) => t.value === pickingType)

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Linked record type"
        value={pickingType ?? ''}
        onChange={(event) => {
          const next = (event.target.value || null) as LinkableSubjectType | null
          setPickingType(next)
          setQuery('')
          setOpen(!!next)
        }}
        className="h-8 rounded border border-input-border bg-transparent px-2 text-xs text-foreground"
      >
        <option value="">No link</option>
        {LINKABLE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {activeType ? (
        <div className="relative">
          <input
            aria-label={`Search ${activeType.searchLabel}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={`Search ${activeType.searchLabel}…`}
            className="h-8 w-44 rounded border border-input-border bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground"
          />
          {open ? (
            <div
              id={listId}
              role="listbox"
              aria-label={activeType.label}
              className="absolute left-0 top-[calc(100%+0.25rem)] z-40 max-h-56 w-56 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
            >
              {candidates.isLoading ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</p>
              ) : candidates.data?.data.length ? (
                candidates.data.data.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onChange({ subjectType: activeType.value, subjectId: c.id, label: c.label })
                      setPickingType(null)
                      setQuery('')
                      setOpen(false)
                    }}
                    className={cn(
                      'block w-full truncate rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent',
                    )}
                  >
                    {c.label}
                  </button>
                ))
              ) : (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Nothing found.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
