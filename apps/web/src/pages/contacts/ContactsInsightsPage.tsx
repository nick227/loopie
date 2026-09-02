import { useLeadInsights, type components } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePageTitle } from '@/lib/headerContext'
import { LEAD_STAGE_LABEL } from '@/lib/leadStages'

type LeadInsights = components['schemas']['LeadInsights']

// Partial, not Record — channelMix only ever returns the outbound-effort channels (see
// leadInsights.ts's INSIGHTS_CHANNELS), never FORM/REFERRAL, but the shared Channel enum includes
// those too since it's reused across the whole taxonomy (ChannelProvider, Interaction.channel).
const CHANNEL_LABEL: Partial<Record<LeadInsights['channelMix'][number]['channel'], string>> = {
  EMAIL: 'Email',
  TEXT: 'Text',
  SOCIAL: 'Social',
  CALL: 'Call',
  MEETING: 'Meeting',
  WEBINAR: 'Webinar',
  EVENT: 'Event',
}

function formatDuration(hours: number | null) {
  if (hours == null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function formatPct(value: number) {
  return `${value.toFixed(0)}%`
}

function formatAvg(value: number | null) {
  return value == null ? '—' : value.toFixed(1)
}

function StatTile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {caption ? <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p> : null}
    </div>
  )
}

function BarRow({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {count} · {formatPct(pct)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

// Management-facing analytics, deliberately separate from the salesperson-facing Contacts landing
// (Work Queue + list) — see CLAUDE.md's CRM insights slice. Everything here is derived from real
// Lead/Interaction data, all-time, no date-range filter yet.
export function ContactsInsightsPage() {
  usePageTitle('Insights')
  const { data, isLoading } = useLeadInsights()

  if (isLoading) return <Skeleton className="h-96 w-full" />
  const insights = data?.data
  if (!insights) return <p className="text-muted-foreground">Not available.</p>

  if (insights.totalLeads === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          variant="detail"
          description="Time-to-contact, effort, and pipeline analytics."
        />
        <p className="text-sm text-muted-foreground">
          No leads yet — insights will populate once your pipeline has activity.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        variant="detail"
        description={`Derived from ${insights.totalLeads} lead${insights.totalLeads === 1 ? '' : 's'} and their real activity — all-time.`}
      />

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Time to first contact</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="Average"
            value={formatDuration(insights.timeToFirstContact.averageHours)}
          />
          <StatTile
            label="Median"
            value={formatDuration(insights.timeToFirstContact.medianHours)}
          />
          <StatTile
            label="Contacted within 1h"
            value={formatPct(insights.contactedWithin.within1hPct)}
          />
          <StatTile
            label="Contacted within 24h"
            value={formatPct(insights.contactedWithin.within24hPct)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Effort to convert</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile
            label="Avg touches before Interested"
            value={formatAvg(insights.avgTouchesBeforeInterested)}
          />
          <StatTile
            label="Avg touches before Closed"
            value={formatAvg(insights.avgTouchesBeforeClosed)}
          />
          <StatTile
            label="Overdue follow-ups"
            value={formatPct(insights.overdueFollowUpRate)}
            caption="of currently open leads"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Channel mix</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.channelMix.every((c) => c.count === 0) ? (
            <p className="text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            insights.channelMix.map((c) => (
              <BarRow
                key={c.channel}
                label={CHANNEL_LABEL[c.channel] ?? c.channel}
                count={c.count}
                pct={c.pct}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Stage conversion</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.stageConversion.map((s) => (
            <BarRow
              key={s.stage}
              label={LEAD_STAGE_LABEL[s.stage as keyof typeof LEAD_STAGE_LABEL] ?? s.stage}
              count={s.reachedCount}
              pct={s.pct}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
