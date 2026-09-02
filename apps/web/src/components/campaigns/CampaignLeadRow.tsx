import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'
import { formatDollars } from '@/lib/money'
import { LEAD_STAGE_LABEL } from '@/lib/leadStages'

type CampaignLead = components['schemas']['CampaignLead']

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
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pr-6 align-top">
        <Link
          to={`/contacts/${lead.contactId}`}
          className="block hover:underline underline-offset-4"
        >
          <span className="text-sm font-medium">{lead.contactName}</span>
          <p className="text-xs text-muted-foreground">Acquired {when(lead.acquiredAt)}</p>
        </Link>
      </td>
      <td className="py-3 pr-6 align-top text-sm">{lead.sourceLabel}</td>
      <td className="py-3 pr-6 align-top text-sm">{LEAD_STAGE_LABEL[lead.stage]}</td>
      <td className="py-3 pr-6 align-top text-sm tabular-nums">
        {lead.attributedValue == null ? '—' : formatDollars(lead.attributedValue)}
      </td>
      <td className="py-3 align-top text-sm">
        <p>
          {lead.lastInteractionType
            ? `${INTERACTION_LABEL[lead.lastInteractionType] ?? lead.lastInteractionType}${
                lead.lastInteractionAt ? ` · ${when(lead.lastInteractionAt)}` : ''
              }`
            : '—'}
        </p>
        <p className="text-xs text-muted-foreground">{followUp}</p>
      </td>
    </tr>
  )
}
