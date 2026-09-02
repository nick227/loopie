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
  MEETING: 'Meeting',
  WEBINAR: 'Webinar',
  EVENT: 'Event',
  FOLLOW_UP: 'Follow-up',
}

export function InteractionRow({ interaction }: { interaction: Interaction }) {
  const note =
    interaction.metadata && typeof interaction.metadata === 'object'
      ? (interaction.metadata as Record<string, unknown>).note
      : undefined
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium">{TYPE_LABEL[interaction.type]}</p>
          {interaction.provider ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {interaction.provider.name}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(interaction.occurredAt).toLocaleString()}
        </p>
        {typeof note === 'string' && note ? (
          <p className="mt-1.5 text-sm text-foreground">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
