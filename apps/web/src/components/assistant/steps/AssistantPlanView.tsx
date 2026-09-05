import { useScheduleAssistantPlan } from '@project/sdk'
import { Button } from '@/components/ui/Button'

type PlannedTask = {
  templateId: string
  title: string
  horizon: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'
}

// Act's plan preview (docs' "Your first plan" — a compact task list + one "Add to Calendar"
// action). The actual steps are already resolved server-side (playbook + qualification answers);
// this view just presents them and, on confirm, calls scheduleAssistantPlan which turns them into
// real ScheduledGoal rows through the same CalendarService every other Calendar action uses.
export function AssistantPlanView({
  cycleId,
  plan,
  onSuccess,
}: {
  cycleId: string
  plan: PlannedTask[]
  onSuccess: () => void
}) {
  const schedule = useScheduleAssistantPlan()

  async function handleAdd() {
    await schedule.mutateAsync({ cycleId })
    onSuccess()
  }

  return (
    <div className="space-y-4">
      {/* One grouped surface with hairline dividers, not a stack of individually bordered boxes —
          these rows are a static preview, not choices, so they share a single container. */}
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {plan.map((task) => (
          <li key={task.templateId} className="px-4 py-3 text-sm text-foreground">
            {task.title}
          </li>
        ))}
      </ul>
      <Button onClick={handleAdd} loading={schedule.isPending} className="w-full">
        Add to Calendar
      </Button>
    </div>
  )
}
