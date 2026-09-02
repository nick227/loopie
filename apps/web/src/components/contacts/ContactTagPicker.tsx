import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import {
  useContactTags,
  useAssignContactTag,
  useUnassignContactTag,
  type components,
  type ContactTagColor,
} from '@project/sdk'
import { TAG_COLOR_CLASSES, TAG_COLOR_DOT } from '@/lib/tagColors'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type ContactTagRef = components['schemas']['ContactTagRef']

function TagChip({
  tag,
  onRemove,
  removing,
}: {
  tag: { name: string; color: ContactTagColor }
  onRemove?: () => void
  removing?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        TAG_COLOR_CLASSES[tag.color],
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TAG_COLOR_DOT[tag.color])} />
      {tag.name}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${tag.name}`}
          className="-mr-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X size={10} />
        </button>
      ) : null}
    </span>
  )
}

// Assigned chips (remove-without-delete) + an inline add-dropdown (autocomplete existing tags,
// "Create '<query>'" for a new one) — the one shared tag-management widget, generic enough (reads
// only the business's tag catalog, not anything Contact-specific beyond the assign/unassign calls)
// to reuse for Audiences/segments later, per the CRM structured-tags slice.
export function ContactTagPicker({
  contactId,
  assigned,
}: {
  contactId: string
  assigned: ContactTagRef[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const catalogQuery = useContactTags({ q: debouncedQuery || undefined })
  const assign = useAssignContactTag()
  const unassign = useUnassignContactTag()
  const [removingId, setRemovingId] = useState<string | null>(null)
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

  const assignedIds = new Set(assigned.map((t) => t.id))
  const catalog = (catalogQuery.data?.data ?? []).filter((t) => !assignedIds.has(t.id))
  const exactMatch = catalog.some((t) => t.name.toLowerCase() === query.trim().toLowerCase())

  async function pick(input: { tagId: string } | { name: string }) {
    try {
      await assign.mutateAsync({ contactId, ...input })
      setQuery('')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this tag.')
    }
  }

  async function remove(tagId: string) {
    setRemovingId(tagId)
    try {
      await unassign.mutateAsync({ contactId, tagId })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove this tag.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          onRemove={() => remove(tag.id)}
          removing={removingId === tag.id}
        />
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or create…"
              className="mb-1.5 w-full rounded border border-input-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {catalog.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => pick({ tagId: tag.id })}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      TAG_COLOR_DOT[tag.color as ContactTagColor],
                    )}
                  />
                  {tag.name}
                </button>
              ))}
              {query.trim() && !exactMatch ? (
                <button
                  type="button"
                  onClick={() => pick({ name: query.trim() })}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                >
                  <Plus size={12} /> Create &quot;{query.trim()}&quot;
                </button>
              ) : null}
              {!query.trim() && catalog.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No tags yet — start typing to create one.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
