import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Mail, MessageSquare, Phone, Users, Presentation, Plus, Check } from 'lucide-react'
import {
  useLogContactActivity,
  useUpdateLead,
  useChannelProviders,
  type components,
  type Channel,
} from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { relativeTimeLabel } from '@/components/home/homeFormat'
import { cn } from '@/lib/utils'

type ContactCurrentLead = components['schemas']['ContactCurrentLead']

const STAGE_LABEL: Record<ContactCurrentLead['stage'], string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  ENGAGED: 'Engaged',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
}
const STAGE_STYLE: Record<ContactCurrentLead['stage'], string> = {
  NEW: 'bg-muted text-muted-foreground',
  CONTACTED: 'bg-info/10 text-info',
  ENGAGED: 'bg-info/10 text-info',
  QUALIFIED: 'bg-primary/10 text-primary',
  PROPOSAL: 'bg-primary/10 text-primary',
  WON: 'bg-success/10 text-success',
  LOST: 'bg-muted text-muted-foreground',
}

// channel mirrors lib/channelProviders.ts#channelForInteractionType server-side — FOLLOW_UP has
// no deterministic channel (it's not tied to one medium), so it gets no provider field.
const LOGGABLE_TYPES: {
  value: 'CALL_LOGGED' | 'MEETING' | 'WEBINAR' | 'EVENT' | 'FOLLOW_UP'
  label: string
  channel?: Channel
}[] = [
  { value: 'CALL_LOGGED', label: 'Call', channel: 'CALL' },
  { value: 'MEETING', label: 'Meeting', channel: 'MEETING' },
  { value: 'WEBINAR', label: 'Webinar', channel: 'WEBINAR' },
  { value: 'EVENT', label: 'Event', channel: 'EVENT' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
]

function CountTile({
  icon: Icon,
  count,
  label,
}: {
  icon: typeof Mail
  count: number
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Icon size={14} className="text-muted-foreground" />
      <span className="font-semibold tabular-nums text-foreground">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function LogActivityButton({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<(typeof LOGGABLE_TYPES)[number]['value']>('CALL_LOGGED')
  const [providerName, setProviderName] = useState('')
  const [note, setNote] = useState('')
  const logActivity = useLogContactActivity()
  const ref = useRef<HTMLDivElement>(null)
  const channel = LOGGABLE_TYPES.find((o) => o.value === type)?.channel
  // Existing providers on this channel, offered as suggestions — free text still creates a new
  // one (find-or-create), same discipline as ContactTagPicker's tag input.
  const providerQuery = useChannelProviders(channel ? { channel } : undefined)
  const providers = providerQuery.data?.data ?? []

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  async function submit() {
    try {
      await logActivity.mutateAsync({
        contactId,
        type,
        providerName: providerName.trim() || undefined,
        note: note.trim() || undefined,
      })
      setNote('')
      setProviderName('')
      setOpen(false)
      toast.success('Activity logged')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log this activity.')
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={13} /> Log activity
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 space-y-2 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <div className="flex flex-wrap gap-1">
            {LOGGABLE_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setType(option.value)
                  setProviderName('')
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium',
                  type === option.value
                    ? 'border-foreground/30 bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {channel ? (
            <>
              <Input
                list={`provider-suggestions-${channel}`}
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder="Tool used (optional) — e.g. Zoom"
                className="h-8 text-xs"
              />
              <datalist id={`provider-suggestions-${channel}`}>
                {providers.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </>
          ) : null}
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Notes (optional)"
            className="min-h-[60px]"
          />
          <div className="flex justify-end">
            <Button size="sm" loading={logActivity.isPending} onClick={submit}>
              Log
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NextAction({
  leadId,
  note,
  at,
}: {
  leadId: string
  note: string | null
  at: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draftNote, setDraftNote] = useState(note ?? '')
  const [draftAt, setDraftAt] = useState(at ? at.slice(0, 10) : '')
  const update = useUpdateLead()

  async function save() {
    try {
      await update.mutateAsync({
        leadId,
        nextActionNote: draftNote.trim() || null,
        nextActionAt: draftAt ? new Date(`${draftAt}T00:00:00`).toISOString() : null,
      })
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this next action.')
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          autoFocus
          value={draftNote}
          onChange={(event) => setDraftNote(event.target.value)}
          placeholder="What happens next?"
          className="min-h-[50px]"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draftAt}
            onChange={(event) => setDraftAt(event.target.value)}
            className="h-8 rounded border border-input-border bg-transparent px-2 text-xs"
          />
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={update.isPending} onClick={save}>
              <Check size={13} /> Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        + Add next action
      </button>
    )
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="block w-full text-left">
      <p className="text-sm text-foreground">{note}</p>
      {at ? (
        <p className="text-xs text-muted-foreground">Due {new Date(at).toLocaleDateString()}</p>
      ) : null}
    </button>
  )
}

// The "lead card" — makes the CRM feel operational rather than archival (CLAUDE.md's CRM
// pipeline/activity slice). Stage is explicit; everything else here is either derived from real
// Interaction rows (contacted?, counts, last touch) or a plain editable field (next action) — no
// second state machine, per the "pipeline stage is explicit, marketing effort is observable from
// activity" principle.
export function ContactLeadCard({
  contactId,
  currentLead,
}: {
  contactId: string
  currentLead: ContactCurrentLead | null
}) {
  if (!currentLead) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          No pipeline activity yet for this contact.
        </CardContent>
      </Card>
    )
  }

  const counts = currentLead.activityCounts

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
              STAGE_STYLE[currentLead.stage],
            )}
          >
            {STAGE_LABEL[currentLead.stage]}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              currentLead.contacted
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {currentLead.contacted ? 'Contacted' : 'Not yet contacted'}
          </span>
        </div>
        <LogActivityButton contactId={contactId} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <CountTile icon={Mail} count={counts.email} label="email" />
          <CountTile icon={MessageSquare} count={counts.text} label="text" />
          <CountTile icon={Phone} count={counts.call} label="call" />
          <CountTile icon={Users} count={counts.meeting} label="meeting" />
          <CountTile icon={Presentation} count={counts.webinarEvent} label="webinar/event" />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Last touch</p>
            <p className="text-sm text-foreground">
              {currentLead.lastTouchAt ? relativeTimeLabel(currentLead.lastTouchAt) : 'Never'}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Next action</p>
            <NextAction
              leadId={currentLead.id}
              note={currentLead.nextActionNote ?? null}
              at={currentLead.nextActionAt ?? null}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
