import { QueryFeedback, Section } from '../components/CalendarPrimitives'
import { GoalRow, GroupedGoalList } from '../components/GoalRow'
import { IdeasSection } from '../components/IdeasSection'
import type { CalendarData } from '../hooks/useCalendarData'

export function CalendarListView({
  board,
  focusedGoalId,
}: {
  board: CalendarData['board']
  focusedGoalId: string | null
}) {
  if (board.isLoading || board.isError) return <QueryFeedback query={board} />
  const { today, thisWeek, recentlyCompleted, ideas } = board
  return (
    <div className="space-y-8">
      {today.length > 0 ? (
        <Section label="Today">
          {today.map((goal) => (
            <GoalRow key={goal.id} goal={goal} focusedGoalId={focusedGoalId} />
          ))}
        </Section>
      ) : null}

      {thisWeek.length > 0 ? (
        <Section label="This week" bare>
          <GroupedGoalList
            focusedGoalId={focusedGoalId}
            goals={thisWeek}
            dateField="scheduledFor"
            direction="future"
          />
        </Section>
      ) : null}

      {recentlyCompleted.length > 0 ? (
        <Section label="Recently completed" bare>
          <GroupedGoalList
            focusedGoalId={focusedGoalId}
            goals={recentlyCompleted}
            dateField="completedAt"
            direction="past"
          />
        </Section>
      ) : null}

      <IdeasSection ideas={ideas} />
    </div>
  )
}
