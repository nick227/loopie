import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useContactTags } from '@project/sdk'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

// The create-mode counterpart to ContactTagPicker — a brand-new contact has no id yet, so tags
// can't be assigned via POST /contacts/{id}/tags. Instead this holds plain names in local state,
// submitted via CreateContactInput.tags (the same legacy name-array field the catalog already
// resolves server-side — see lib/contactTags.ts#syncContactTags), and offers the same catalog
// autocomplete as the live picker so typing "Repeat" still suggests the existing tag. Pills are
// plain/neutral here, not color-coded — a pending tag has no catalog color until it's actually
// resolved at save time.
export function PendingTagsInput({
  names,
  onChange,
}: {
  names: string[]
  onChange: (names: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const catalogQuery = useContactTags({ q: debouncedQuery || undefined })
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const lowerNames = names.map((n) => n.toLowerCase())
  const catalog = (catalogQuery.data?.data ?? []).filter(
    (t) => !lowerNames.includes(t.name.toLowerCase()),
  )
  const exactMatch = catalog.some((t) => t.name.toLowerCase() === query.trim().toLowerCase())

  function add(name: string) {
    const trimmed = name.trim()
    if (!trimmed || lowerNames.includes(trimmed.toLowerCase())) return
    onChange([...names, trimmed])
    setQuery('')
    setOpen(false)
  }

  function remove(name: string) {
    onChange(names.filter((n) => n !== name))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
        >
          {name}
          <button
            type="button"
            onClick={() => remove(name)}
            aria-label={`Remove ${name}`}
            className="-mr-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-input-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          <Plus size={11} /> Tag
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg">
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  add(query)
                }
              }}
              placeholder="Search or create…"
              className="mb-1.5 w-full rounded border border-input-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {catalog.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => add(tag.name)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {tag.name}
                </button>
              ))}
              {query.trim() && !exactMatch ? (
                <button
                  type="button"
                  onClick={() => add(query)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-accent',
                  )}
                >
                  <Plus size={12} /> Create &quot;{query.trim()}&quot;
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
