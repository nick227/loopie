import { useParams } from 'react-router-dom'
import { useAutomation, useAutomationLogs } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
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
      <PageHeader
        variant="detail"
        title="Logs"
        breadcrumb={{ label: item.name, to: `/automations/${item.id}` }}
      />
      <Card>
        <CardContent className="py-4">
          <AutomationLogs logs={logsQuery.data?.data ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
