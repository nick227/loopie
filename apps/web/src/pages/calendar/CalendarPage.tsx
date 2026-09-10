import { usePageTitle } from '@/lib/headerContext'
import { CalendarToolbar } from './components/CalendarToolbar'
import { AssigneeFilter } from './components/TaskOwnership'
import { useCalendarData } from './hooks/useCalendarData'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { TeamActivitySection } from './tracking/TeamActivitySection'
import { CalendarGridView } from './views/CalendarGridView'
import { CalendarListView } from './views/CalendarListView'

export function CalendarPage() {
  usePageTitle('Calendar')
  const navigation = useCalendarNavigation()
  const data = useCalendarData(navigation.queryInput)

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <CalendarToolbar navigation={navigation} />
      <AssigneeFilter {...navigation.assignee} />
      <TeamActivitySection />
      {navigation.view === 'list' ? (
        <CalendarListView board={data.board} focusedGoalId={navigation.focusedGoalId} />
      ) : (
        <CalendarGridView navigation={navigation.grid} data={data} />
      )}
    </div>
  )
}
