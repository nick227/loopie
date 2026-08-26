import { Link } from 'react-router-dom'
import { actionLabel, outcomeLabel } from '@/lib/automationCopy'

export type AutomationLogRow = {
  id: string
  contactId: string
  action: string
  outcome: string
  reasonSkipped?: string | null
  triggeredAt: string
}

function when(iso: string) {
  return new Date(iso).toLocaleString()
}

export function AutomationLogs({ logs }: { logs: AutomationLogRow[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet.</p>
  }

  return (
    <div className="space-y-3">
      {logs.map((row) => (
        <div key={row.id} className="space-y-1">
          <p className="text-sm flex justify-between gap-3">
            <span>
              {outcomeLabel(row.outcome)} · {actionLabel(row.action)}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{when(row.triggeredAt)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            <Link to={`/contacts/${row.contactId}`} className="hover:underline">
              Contact
            </Link>
            {row.reasonSkipped ? ` · ${row.reasonSkipped}` : ''}
          </p>
        </div>
      ))}
    </div>
  )
}
