import { useState } from 'react'
import { toast } from 'sonner'
import { Pin, PinOff, Trash2, Pencil } from 'lucide-react'
import {
  useContactNotes,
  useCreateContactNote,
  useUpdateContactNote,
  useDeleteContactNote,
  type components,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFlatPages } from '@/hooks/useFlatPages'

type ContactNote = components['schemas']['ContactNote']

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function NoteRow({ note, contactId }: { note: ContactNote; contactId: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const update = useUpdateContactNote()
  const remove = useDeleteContactNote()

  async function save() {
    const body = draft.trim()
    if (!body || body === note.body) {
      setEditing(false)
      setDraft(note.body)
      return
    }
    try {
      await update.mutateAsync({ contactId, noteId: note.id, body })
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this note.')
    }
  }

  async function togglePin() {
    try {
      await update.mutateAsync({ contactId, noteId: note.id, pinned: !note.pinnedAt })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this note.')
    }
  }

  async function remove_() {
    if (!window.confirm('Delete this note?')) return
    try {
      await remove.mutateAsync({ contactId, noteId: note.id })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this note.')
    }
  }

  return (
    <div className="group rounded-lg border border-border p-3 text-sm">
      {editing ? (
        <div className="space-y-2">
          <Textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false)
                setDraft(note.body)
              }}
            >
              Cancel
            </Button>
            <Button size="sm" loading={update.isPending} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {relativeTime(note.updatedAt)}
              {note.updatedAt !== note.createdAt ? ' · edited' : ''}
            </p>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={togglePin}
                aria-label={note.pinnedAt ? 'Unpin note' : 'Pin note'}
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {note.pinnedAt ? <PinOff size={13} /> : <Pin size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit note"
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={remove_}
                aria-label="Delete note"
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ContactNotes({ contactId }: { contactId: string }) {
  const [draft, setDraft] = useState('')
  const query = useContactNotes(contactId)
  const create = useCreateContactNote()
  const notes = useFlatPages(query)
  const pinned = notes.filter((note) => note.pinnedAt)
  const recent = notes.filter((note) => !note.pinnedAt)

  async function addNote() {
    const body = draft.trim()
    if (!body) return
    try {
      await create.mutateAsync({ contactId, body })
      setDraft('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this note.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a note about this contact…"
          className="min-h-[60px]"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void addNote()
          }}
        />
        <div className="flex justify-end">
          <Button size="sm" loading={create.isPending} disabled={!draft.trim()} onClick={addNote}>
            Add note
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {pinned.map((note) => (
            <NoteRow key={note.id} note={note} contactId={contactId} />
          ))}
          {recent.map((note) => (
            <NoteRow key={note.id} note={note} contactId={contactId} />
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more notes'}
        </button>
      ) : null}
    </div>
  )
}
