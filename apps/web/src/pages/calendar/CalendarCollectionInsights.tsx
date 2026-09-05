import { ListChecks, CalendarDays, CheckCircle2, Lightbulb } from 'lucide-react'
import type { components } from '@project/sdk'
import {
  CollectionInsightsPanel,
  CollectionInsightsSkeleton,
} from '@/components/welcome/CollectionInsightsPanel'

type ScheduledGoal = components['schemas']['ScheduledGoal']
type GoalIdea = components['schemas']['GoalIdea']

// The same shared icon-tile metrics panel Pages/Advertising/Contacts open with, built entirely
// from the board CalendarPage has already fetched (today/thisWeek/recentlyCompleted/ideas) — no
// separate query, no fabricated stat.
export function CalendarCollectionInsights({
  today,
  thisWeek,
  recentlyCompleted,
  ideas,
  loading = false,
}: {
  today: ScheduledGoal[]
  thisWeek: ScheduledGoal[]
  recentlyCompleted: ScheduledGoal[]
  ideas: GoalIdea[]
  loading?: boolean
}) {
  if (loading) return <CollectionInsightsSkeleton />
  return (
    <CollectionInsightsPanel
      stats={[
        { icon: ListChecks, value: String(today.length), label: 'due today' },
        { icon: CalendarDays, value: String(thisWeek.length), label: 'this week' },
        {
          icon: CheckCircle2,
          value: String(recentlyCompleted.length),
          label: 'recently completed',
        },
        { icon: Lightbulb, value: String(ideas.length), label: 'ideas ready' },
      ]}
    />
  )
}
