import { db } from '@project/db'
import type { InteractionType, Prisma } from '@prisma/client'

export type LeadActivityFlag =
  'emailed' | 'called' | 'texted' | 'webinar' | 'meeting' | 'followUp' | 'proposalSent'

export const LEAD_ACTIVITY_FLAGS: LeadActivityFlag[] = [
  'emailed',
  'called',
  'texted',
  'webinar',
  'meeting',
  'followUp',
  'proposalSent',
]

const TYPE_TO_FLAG: Partial<Record<InteractionType, LeadActivityFlag>> = {
  EMAIL_SENT: 'emailed',
  TEXT_SENT: 'texted',
  CALL_LOGGED: 'called',
  MEETING: 'meeting',
  WEBINAR: 'webinar',
  FOLLOW_UP: 'followUp',
  QUOTE_SENT: 'proposalSent',
}

export function activityFlagForInteractionType(type: string): LeadActivityFlag | null {
  return TYPE_TO_FLAG[type as InteractionType] ?? null
}

type Tx = Prisma.TransactionClient | typeof db

/** Set one activity flag on every open lead for the given contact(s). Never clears. */
export async function markOpenLeadActivity(
  businessId: string,
  contactIds: string | string[],
  flag: LeadActivityFlag,
  tx: Tx = db,
) {
  const ids = Array.isArray(contactIds) ? contactIds : [contactIds]
  if (ids.length === 0) return
  await tx.lead.updateMany({
    where: { businessId, contactId: { in: ids }, openSlot: 'OPEN' },
    data: { [flag]: true },
  })
}

export async function markOpenLeadActivityFromInteraction(
  businessId: string,
  contactIds: string | string[],
  interactionType: string,
  tx: Tx = db,
) {
  const flag = activityFlagForInteractionType(interactionType)
  if (!flag) return
  await markOpenLeadActivity(businessId, contactIds, flag, tx)
}

export function toLeadActivityDTO(lead: {
  emailed: boolean
  called: boolean
  texted: boolean
  webinar: boolean
  meeting: boolean
  followUp: boolean
  proposalSent: boolean
}) {
  return {
    emailed: lead.emailed,
    called: lead.called,
    texted: lead.texted,
    webinar: lead.webinar,
    meeting: lead.meeting,
    followUp: lead.followUp,
    proposalSent: lead.proposalSent,
  }
}

export const CLOSED_STAGES = ['CLOSED', 'NOT_INTERESTED'] as const

export function isClosedStage(stage: string): boolean {
  return stage === 'CLOSED' || stage === 'NOT_INTERESTED'
}
