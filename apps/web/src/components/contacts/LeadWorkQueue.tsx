import { useMemo, useState } from 'react'
import { useLeadQueue, type components } from '@project/sdk'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { UniversalRow, UniversalRowList } from '@/components/ui/UniversalRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { relativeTime } from '@/components/home/homeFormat'
import { mediaSrc } from '@/lib/media'
import { LEAD_STAGE_LABEL } from '@/lib/leadStages'
import { cn } from '@/lib/utils'
import { PartyPopper } from 'lucide-react'

type LeadQueueItem = components['schemas']['LeadQueueItem']
type Bucket = 'OVERDUE' | 'NEVER_CONTACTED' | 'NEEDS_FOLLOW_UP' | 'NEW' | 'INTERESTED'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'NEVER_CONTACTED', label: 'Never contacted' },
  { key: 'NEEDS_FOLLOW_UP', label: 'Needs follow-up' },
  { key: 'NEW', label: 'New' },
  { key: 'INTERESTED', label: 'Interested' },
]

const ACCENT: Record<Bucket, 'destructive' | 'warning' | 'info' | 'neutral' | 'primary'> = {
  OVERDUE: 'destructive',
  NEVER_CONTACTED: 'warning',
  NEEDS_FOLLOW_UP: 'info',
  NEW: 'neutral',
  INTERESTED: 'primary',
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function QueueRow({ item, activeBucket }: { item: LeadQueueItem; activeBucket: Bucket }) {
  const src = mediaSrc(item.contact.avatarUrl)
  const otherFlags = item.buckets.filter((b) => b !== activeBucket)
  return (
    <UniversalRow
      density="comfortable"
      href={`/contacts/${item.contact.id}`}
      state={{ from: 'Contacts', fromTo: '/contacts' }}
      accent={ACCENT[activeBucket]}
      leadingShape="circle"
      leading={
        src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-muted text-sm font-medium text-muted-foreground">
            {initials(item.contact.name)}
          </span>
        )
      }
      title={item.contact.name}
      subtitle={
        <>
          {LEAD_STAGE_LABEL[item.stage]} · opened {relativeTime(item.openedAt)} ago
          {item.lastTouchAt
            ? ` · last touch ${relativeTime(item.lastTouchAt)} ago`
            : ' · never touched'}
        </>
      }
      meta={
        otherFlags.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            also {BUCKETS.find((b) => b.key === otherFlags[0])?.label.toLowerCase()}
          </span>
        ) : undefined
      }
      trailing={
        item.nextActionNote ? (
          <span className="max-w-[14rem] truncate text-xs text-foreground">
            {item.nextActionNote}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No next action set</span>
        )
      }
    />
  )
}

// The default CRM landing experience (CLAUDE.md's CRM work-queue slice) — answers "who's new,
// who's never been contacted, who needs follow-up, who's overdue, who's engaged, what was the
// last touch, what should happen next" in one place, sitting above the searchable full contact
// list rather than replacing it. Stage stays explicit (the badge); everything else here is
// derived from real activity or the plain nextAction fields — no separate queue-specific state.
export function LeadWorkQueue() {
  const query = useLeadQueue()
  const items = useMemo(() => query.data?.data ?? [], [query.data])

  const byBucket = useMemo(() => {
    const map = new Map<Bucket, LeadQueueItem[]>()
    for (const { key } of BUCKETS) map.set(key, [])
    for (const item of items) {
      for (const bucket of item.buckets) {
        map.get(bucket as Bucket)?.push(item)
      }
    }
    return map
  }, [items])

  const [active, setActive] = useState<Bucket | null>(null)
  const defaultActive = BUCKETS.find((b) => (byBucket.get(b.key)?.length ?? 0) > 0)?.key ?? 'NEW'
  const selected = active ?? defaultActive
  const selectedItems = byBucket.get(selected) ?? []

  if (query.isLoading) return <Skeleton className="w-full" />
  if (items.length === 0) {
    return <EmptyState icon={PartyPopper} title="All caught up" />
  }

  return (
    <div className="space-y-3">
      <EntityTabs<Bucket>
        tabs={BUCKETS.map((b) => ({
          key: b.key,
          label: `${b.label} (${byBucket.get(b.key)?.length ?? 0})`,
        }))}
        active={selected}
        onChange={setActive}
      />
      {selectedItems.length === 0 ? (
        <p className={cn('py-6 text-center text-sm text-muted-foreground')}>
          Nothing here right now.
        </p>
      ) : (
        <UniversalRowList>
          {selectedItems.map((item) => (
            <QueueRow key={item.id} item={item} activeBucket={selected} />
          ))}
        </UniversalRowList>
      )}
    </div>
  )
}
