import { db } from '@project/db'
import type { Automation, AutomationRun, Contact, Lead } from '@prisma/client'

const OUTBOUND_INTERACTION_TYPE = { SEND_EMAIL: 'EMAIL_SENT', SEND_TEXT: 'TEXT_SENT' } as const

export class AutomationActionService {
  async fireAction(automation: Automation, run: AutomationRun, contact: Contact): Promise<void> {
    switch (automation.action) {
      case 'SEND_EMAIL':
      case 'SEND_TEXT': {
        await db.$transaction([
          db.interaction.create({
            data: {
              businessId: contact.businessId,
              contactId: contact.id,
              type: OUTBOUND_INTERACTION_TYPE[automation.action],
              metadata: { automationId: automation.id },
            },
          }),
          db.contact.update({ where: { id: contact.id }, data: { lastContactedAt: new Date() } }),
        ])
        return
      }
      case 'CREATE_REMINDER': {
        const note = (automation.actionValue as { note?: string } | null)?.note ?? null
        await db.interaction.create({
          data: {
            businessId: contact.businessId,
            contactId: contact.id,
            type: 'NOTE',
            metadata: { automationId: automation.id, reminder: true, note },
          },
        })
        return
      }
      case 'CHANGE_LEAD_STATUS': {
        if (!run.leadId) throw new Error('CHANGE_LEAD_STATUS has no lead context to update')
        const stage = (automation.actionValue as { stage?: string } | null)?.stage
        if (!stage) throw new Error('CHANGE_LEAD_STATUS actionValue.stage is missing')
        const current = await db.lead.findUnique({ where: { id: run.leadId } })
        const closesNow = (stage === 'WON' || stage === 'LOST') && !current?.closedAt
        await db.lead.update({
          where: { id: run.leadId },
          data: {
            stage: stage as Lead['stage'],
            ...(closesNow ? { closedAt: new Date(), openSlot: null } : {}),
          },
        })
        return
      }
      case 'NOTIFY_USER':
        return
      case 'STOP_SEQUENCE': {
        await db.automationRun.updateMany({
          where: { contactId: contact.id, status: 'PENDING', id: { not: run.id } },
          data: { status: 'CANCELED' },
        })
        return
      }
    }
  }
}
