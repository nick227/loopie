import { db } from '@project/db'
import type { Automation, AutomationRun, Contact, Lead } from '@prisma/client'

export type SkipResult = { skip: true; reason: string }
export type ProceedResult = { skip: false }
export type EvalResult = SkipResult | ProceedResult

export function skip(reason: string): SkipResult {
  return { skip: true, reason }
}

export class AutomationConditionService {
  async checkDefaultStopConditions(
    automation: Automation,
    run: AutomationRun,
    contact: Contact,
    lead: Lead | null,
  ): Promise<EvalResult> {
    if (!automation.isActive) return skip('Automation is paused')

    if (automation.action === 'SEND_EMAIL' && (!contact.emailEligible || contact.emailOptOutAt)) {
      return skip('Contact is not email-eligible')
    }
    if (automation.action === 'SEND_TEXT' && (!contact.smsEligible || contact.smsOptOutAt)) {
      return skip('Contact is not SMS-eligible')
    }

    if (lead?.closedAt && lead.closedAt >= run.triggerEventAt) {
      return skip(`Lead is closed (${lead.stage})`)
    }

    const reply = await db.interaction.findFirst({
      where: { contactId: contact.id, type: 'REPLY', occurredAt: { gte: run.triggerEventAt } },
    })
    if (reply) return skip('Contact has replied')

    const sale = await db.sale.findFirst({
      where: { contactId: contact.id, createdAt: { gte: run.triggerEventAt } },
    })
    if (sale) return skip('A sale was recorded')

    return { skip: false }
  }

  async checkCondition(
    automation: Automation,
    contact: Contact,
    lead: Lead | null,
  ): Promise<EvalResult> {
    if (!automation.condition) return { skip: false }

    switch (automation.condition) {
      case 'HAS_REPLIED': {
        const reply = await db.interaction.findFirst({
          where: { contactId: contact.id, type: 'REPLY' },
        })
        return reply ? { skip: false } : skip('Contact has not replied')
      }
      case 'HAS_NOT_REPLIED': {
        const reply = await db.interaction.findFirst({
          where: { contactId: contact.id, type: 'REPLY' },
        })
        return reply ? skip('Contact has replied') : { skip: false }
      }
      case 'LEAD_STILL_OPEN':
        return lead && !lead.closedAt ? { skip: false } : skip('Lead is not open')
      case 'LEAD_REACHED_STAGE': {
        const target = (automation.conditionValue as { stage?: string } | null)?.stage
        return lead?.stage === target
          ? { skip: false }
          : skip(`Lead has not reached stage ${target ?? '(unset)'}`)
      }
      case 'CUSTOMER_STATUS': {
        const wantStatus =
          (automation.conditionValue as { status?: string } | null)?.status ?? 'CUSTOMER'
        const hasSale = await db.sale.findFirst({ where: { contactId: contact.id } })
        const isCustomer = !!hasSale
        const met = wantStatus === 'CUSTOMER' ? isCustomer : !isCustomer
        return met ? { skip: false } : skip(`Contact is not a ${wantStatus.toLowerCase()}`)
      }
      case 'CHANNEL_ELIGIBILITY': {
        const eligible =
          automation.action === 'SEND_TEXT' ? contact.smsEligible : contact.emailEligible
        return eligible ? { skip: false } : skip('Contact is not eligible on this channel')
      }
    }
  }
}
