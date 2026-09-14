import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMessage, useMessagePerformance } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePageTitle } from '@/lib/headerContext'
import { formatDollars } from '@/lib/money'
import { bodyPreview } from '@/components/messages/MessageRow'

// MessageService.performance() is honest about what's actually tracked: sent/delivered/replied/
// leads/sales/revenue are real counts, but opened/clicked/unsubscribed are hardcoded 0 with a
// comment explaining there's no tracking-pixel/link-tracking/unsubscribe-webhook provider wired
// yet. Showing those as a bare "0" would misread as "zero people opened this" — a real, false
// claim — instead of the true one, "we don't track this yet." NOT_TRACKED renders that honestly.
const NOT_TRACKED = 'Not tracked yet'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums leading-none tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function MessagePerformancePage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const message = useMessage(messageId!)
  const performance = useMessagePerformance(messageId!)

  usePageTitle('Message performance')

  if (message.isLoading || performance.isLoading) return <Skeleton className="h-48 w-full" />

  const msg = message.data?.data
  const stats = performance.data?.data
  if (!msg || !stats) return <p className="text-muted-foreground">Not found.</p>

  const title = msg.subject?.trim() || bodyPreview(msg.body) || 'Untitled message'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link to={`/messages/${msg.id}`} className="hover:underline underline-offset-4">
            {title}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Performance</h1>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-6 py-5 sm:grid-cols-3">
          <Stat label="Sent" value={(stats.sent ?? 0).toLocaleString()} />
          <Stat label="Delivered" value={(stats.delivered ?? 0).toLocaleString()} />
          <Stat label="Replied" value={(stats.replied ?? 0).toLocaleString()} />
          <Stat label="Opened" value={NOT_TRACKED} hint="No open-tracking provider wired yet" />
          <Stat label="Clicked" value={NOT_TRACKED} hint="No link-tracking provider wired yet" />
          <Stat
            label="Unsubscribed"
            value={NOT_TRACKED}
            hint="No unsubscribe-webhook provider wired yet"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-6 py-5 sm:grid-cols-3">
          <Stat label="Leads created" value={(stats.leads ?? 0).toLocaleString()} />
          <Stat label="Sales" value={(stats.sales ?? 0).toLocaleString()} />
          <Stat label="Revenue" value={formatDollars(stats.revenue ?? 0)} />
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" onClick={() => navigate(`/messages/${msg.id}`)}>
        Back to message
      </Button>
    </div>
  )
}
