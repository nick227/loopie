import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDollars } from '@/lib/money'

type CampaignLead = components['schemas']['CampaignLead']

const STAGE_LABEL: Record<CampaignLead['stage'], string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  QUOTED: 'Quoted',
  WON: 'Won',
  LOST: 'Lost',
}

const FOLLOW_UP_LABEL: Record<CampaignLead['followUpStatus'], string> = {
  NONE: 'No follow-up',
  SCHEDULED: 'Scheduled',
  DUE: 'Due',
  SENT: 'Sent',
  STOPPED: 'Stopped',
}

const INTERACTION_LABEL: Record<string, string> = {
  EMAIL_SENT: 'Email sent',
  TEXT_SENT: 'Text sent',
  SOCIAL_POST_SENT: 'Social post',
  REPLY: 'Reply',
  CALL_LOGGED: 'Call',
  NOTE: 'Note',
  STATUS_CHANGE: 'Stage change',
  QUOTE_SENT: 'Quote sent',
  SALE_RECORDED: 'Sale',
  AD_CLICK: 'Ad click',
  FORM_SUBMITTED: 'Form submitted',
  PAGE_VIEWED: 'Page viewed',
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export function CampaignLeadRow({ lead }: { lead: CampaignLead }) {
  const followUp =
    lead.followUpStatus === 'SCHEDULED' && lead.followUpAt
      ? `Scheduled ${when(lead.followUpAt)}`
      : FOLLOW_UP_LABEL[lead.followUpStatus]

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="py-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">{lead.contactName}</p>
          <p className="text-xs text-muted-foreground">Acquired {when(lead.acquiredAt)}</p>
        </div>
        <div>
          <p className="text-sm">{lead.sourceLabel}</p>
          <p className="text-xs text-muted-foreground">{STAGE_LABEL[lead.stage]}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Attributed value</p>
          <p className="text-sm tabular-nums">{lead.attributedValue == null ? '—' : formatDollars(lead.attributedValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last interaction</p>
          <p className="text-sm">
            {lead.lastInteractionType
              ? `${INTERACTION_LABEL[lead.lastInteractionType] ?? lead.lastInteractionType}${lead.lastInteractionAt ? ` · ${when(lead.lastInteractionAt)}` : ''}`
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{followUp}</p>
        </div>
      </CardContent>
    </Card>
  )
}
