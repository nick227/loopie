import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'

type Interaction = components['schemas']['Interaction']

const TYPE_LABEL: Record<Interaction['type'], string> = {
  EMAIL_SENT: 'Email sent',
  TEXT_SENT: 'Text sent',
  SOCIAL_POST_SENT: 'Social post sent',
  REPLY: 'Reply',
  CALL_LOGGED: 'Call logged',
  NOTE: 'Note',
  STATUS_CHANGE: 'Stage change',
  QUOTE_SENT: 'Quote sent',
  SALE_RECORDED: 'Sale recorded',
  AD_CLICK: 'Ad click',
  FORM_SUBMITTED: 'Form submitted',
  PAGE_VIEWED: 'Page viewed',
}

export function InteractionRow({ interaction }: { interaction: Interaction }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-sm font-medium">{TYPE_LABEL[interaction.type]}</p>
        <p className="text-xs text-muted-foreground">{new Date(interaction.occurredAt).toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}
