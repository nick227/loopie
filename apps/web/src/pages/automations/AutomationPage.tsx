import { Link, useParams } from 'react-router-dom'
import { useAutomation, useAutomationLogs } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AutomationLogs } from '@/components/automations/AutomationLogs'
import { actionLabel, automationStatusLabel, triggerLabel } from '@/lib/automationCopy'

export function AutomationPage() {
  const { automationId } = useParams<{ automationId: string }>()
  const automationQuery = useAutomation(automationId!)
  const logsQuery = useAutomationLogs(automationId!)

  if (automationQuery.isLoading) return <Skeleton className="h-48 w-full" />

  const item = automationQuery.data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  const logs = logsQuery.data?.data ?? []
  const lastRun = logs[0]?.triggeredAt

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">{item.name}</h1>
        <Link
          to={item.isActive ? `/automations/${item.id}/pause` : `/automations/${item.id}/resume`}
          className="shrink-0 rounded border border-input-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          {item.isActive ? 'Pause' : 'Resume'}
        </Link>
      </div>
      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-sm">{automationStatusLabel(item.isActive)}</p>
          <p className="text-sm text-muted-foreground">
            When {triggerLabel(item.trigger).toLowerCase()}
            {item.waitDays ? `, wait ${item.waitDays} day${item.waitDays === 1 ? '' : 's'}` : ''},
            then {actionLabel(item.action).toLowerCase()}.
          </p>
          <p className="text-xs text-muted-foreground">
            Last run {lastRun ? new Date(lastRun).toLocaleString() : 'never'}
          </p>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent logs</h2>
          <Link
            to={`/automations/${item.id}/logs`}
            className="text-xs text-muted-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        {logsQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <AutomationLogs logs={logs.slice(0, 8)} />
        )}
      </div>
    </div>
  )
}
