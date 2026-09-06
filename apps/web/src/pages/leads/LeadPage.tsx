import { useNavigate, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useLead } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ContactLink } from '@/components/contacts/ContactLink'
import {
  LogActivityButton,
  StatusSelect,
  ActivityCheckboxes,
  NextAction,
} from '@/components/contacts/ContactLeadCard'
import { formatDollars } from '@/lib/money'
import { SOURCE_TYPE_LABEL } from '@/lib/sourceTypes'
import { usePageTitle } from '@/lib/headerContext'

function opened(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export function LeadPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useLead(leadId!)
  const lead = data?.data

  usePageTitle(lead ? 'Lead' : null)

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!lead) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            <ContactLink contactId={lead.contactId} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Opened {opened(lead.openedAt ?? lead.createdAt)} ·{' '}
            {SOURCE_TYPE_LABEL[lead.sourceType] ?? lead.sourceType}
            {lead.closedAt ? ` · Closed ${opened(lead.closedAt)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lead.estimatedValue != null ? (
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatDollars(lead.estimatedValue)}
              </p>
              <p className="text-xs text-muted-foreground">Est. value</p>
            </div>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
            <Pencil size={13} /> Edit
          </Button>
        </div>
      </div>

      {lead.owner ? <p className="text-sm text-muted-foreground">Owner: {lead.owner}</p> : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <p className="text-xs text-muted-foreground">Status</p>
          <LogActivityButton contactId={lead.contactId} />
        </CardHeader>
        <CardContent className="space-y-5">
          <StatusSelect leadId={lead.id} stage={lead.stage} />
          <ActivityCheckboxes leadId={lead.id} activity={lead.activity} />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Next</p>
            <NextAction
              leadId={lead.id}
              note={lead.nextActionNote ?? null}
              at={lead.nextActionAt ?? null}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
