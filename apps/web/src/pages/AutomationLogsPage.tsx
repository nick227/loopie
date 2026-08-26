import { Link, useParams } from 'react-router-dom'
import { useAutomation, useAutomationLogs } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AutomationLogs } from '@/components/automations/AutomationLogs'

export function AutomationLogsPage() {
  const { automationId } = useParams<{ automationId: string }>()
  const automationQuery = useAutomation(automationId!)
  const logsQuery = useAutomationLogs(automationId!)

  if (automationQuery.isLoading || logsQuery.isLoading) return <Skeleton className="h-48 w-full" />

  const item = automationQuery.data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link
          to={`/automations/${item.id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          {item.name}
        </Link>
        <h1 className="text-xl font-semibold">Logs</h1>
      </div>
      <Card>
        <CardContent className="py-4">
          <AutomationLogs logs={logsQuery.data?.data ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
