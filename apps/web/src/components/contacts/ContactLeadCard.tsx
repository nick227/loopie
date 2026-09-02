import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Check } from 'lucide-react'
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
import { LEAD_STAGE_LABEL, LEAD_STAGE_OPTIONS } from '@/lib/leadStages'
import { cn } from '@/lib/utils'

type ContactCurrentLead = components['schemas']['ContactCurrentLead']
type LeadActivity = components['schemas']['LeadActivity']
type LeadStage = ContactCurrentLead['stage']

const ACTIVITY_OPTIONS: { key: keyof LeadActivity; label: string }[] = [
  { key: 'emailed', label: 'Emailed' },
  { key: 'called', label: 'Called' },
  { key: 'texted', label: 'Texted' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'webinar', label: 'Webinar' },
  { key: 'followUp', label: 'Follow-up' },
  { key: 'proposalSent', label: 'Proposal sent' },
]

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

function LogActivityButton({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<(typeof LOGGABLE_TYPES)[number]['value']>('CALL_LOGGED')
  const [providerName, setProviderName] = useState('')
  const [note, setNote] = useState('')
  const logActivity = useLogContactActivity()
  const ref = useRef<HTMLDivElement>(null)
  const channel = LOGGABLE_TYPES.find((o) => o.value === type)?.channel
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

function StatusSelect({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const update = useUpdateLead()

  async function onChange(next: LeadStage) {
    if (next === stage) return
    try {
      await update.mutateAsync({ leadId, stage: next })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update status.')
    }
  }

  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">Status</span>
      <select
        value={stage}
        disabled={update.isPending}
        onChange={(event) => onChange(event.target.value as LeadStage)}
        className="h-9 w-full max-w-xs rounded-md border border-input-border bg-transparent px-2 text-sm"
      >
        {LEAD_STAGE_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {LEAD_STAGE_LABEL[value]}
          </option>
        ))}
      </select>
    </label>
  )
}

function ActivityCheckboxes({ leadId, activity }: { leadId: string; activity: LeadActivity }) {
  const update = useUpdateLead()
  const [pending, setPending] = useState<keyof LeadActivity | null>(null)

  async function toggle(key: keyof LeadActivity) {
    setPending(key)
    try {
      await update.mutateAsync({
        leadId,
        activity: { [key]: !activity[key] },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update activity.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Activity</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ACTIVITY_OPTIONS.map(({ key, label }) => (
          <label key={key} className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activity[key]}
              disabled={pending === key || update.isPending}
              onChange={() => toggle(key)}
              className="size-3.5 rounded border-border"
            />
            <span className={cn(activity[key] ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
          </label>
        ))}
      </div>
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
  const [draftDate, setDraftDate] = useState(at ? at.slice(0, 10) : '')
  const [draftTime, setDraftTime] = useState(at ? new Date(at).toTimeString().slice(0, 5) : '')
  const update = useUpdateLead()

  async function save() {
    try {
      let nextActionAt: string | null = null
      if (draftDate) {
        if (draftTime) {
          nextActionAt = new Date(`${draftDate}T${draftTime}`).toISOString()
        } else {
          const [year, month, day] = draftDate.split('-').map(Number)
          nextActionAt = new Date(Date.UTC(year!, month! - 1, day!)).toISOString()
        }
      }
      await update.mutateAsync({
        leadId,
        nextActionNote: draftNote.trim() || null,
        nextActionAt,
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
            value={draftDate}
            onChange={(event) => setDraftDate(event.target.value)}
            className="h-8 rounded border border-input-border bg-transparent px-2 text-xs"
          />
          <input
            type="time"
            value={draftTime}
            onChange={(event) => setDraftTime(event.target.value)}
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
        Schedule follow-up
      </button>
    )
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="block w-full text-left">
      <p className="text-sm text-foreground">{note}</p>
      {at ? (
        <p className="text-xs text-muted-foreground">
          Due {new Date(at).toLocaleDateString()}
          {new Date(at).getUTCHours() || new Date(at).getUTCMinutes()
            ? ` at ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ''}
        </p>
      ) : null}
    </button>
  )
}

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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <p className="text-sm font-medium text-foreground">Sales</p>
        <LogActivityButton contactId={contactId} />
      </CardHeader>
      <CardContent className="space-y-5">
        <StatusSelect leadId={currentLead.id} stage={currentLead.stage} />
        <ActivityCheckboxes leadId={currentLead.id} activity={currentLead.activity} />
        <div className="border-t border-border pt-3">
          <p className="mb-1 text-xs text-muted-foreground">Next</p>
          <div className="space-y-1">
            <NextAction
              leadId={currentLead.id}
              note={currentLead.nextActionNote ?? null}
              at={currentLead.nextActionAt ?? null}
            />
            <a
              href="#contact-notes"
              className="block text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Add note
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
