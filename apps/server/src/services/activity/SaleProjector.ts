import { ActivitySourceKind, ActivityAttentionState, AttentionItemState } from '@prisma/client'
import { BaseProjector, ProjectionData } from './BaseProjector'

export class SaleProjector {
  static async project(sale: any, contact: any) {
    const isReversed = sale.reversedAt !== null

    const data: ProjectionData = {
      businessId: sale.businessId,
      sourceKind: ActivitySourceKind.LOOPIE, // Or perhaps PLATFORM if it came from Stripe? Let's use LOOPIE for core sales
      sourceRecordType: 'Sale',
      sourceRecordId: sale.id,
      eventKey: isReversed ? 'SALE_REVERSED' : 'SALE_RECORDED',

      taxonomyVersion: 'v1',
      type: isReversed ? 'SALE_REVERSED' : 'SALE_RECORDED',

      occurredAt: isReversed ? sale.reversedAt : sale.date,
      observedAt: isReversed ? sale.reversedAt : sale.createdAt,
      storyId: `sale-${sale.id}`,

      sourceLabel: 'Sales',

      actorKind: 'CONTACT',
      actorId: contact.id,
      actorLabel: contact.name,

      status: isReversed ? 'REVERSED' : 'RECORDED',
      attention: isReversed
        ? ActivityAttentionState.ACTION_REQUIRED
        : ActivityAttentionState.INFORMATION,
      summary: isReversed
        ? `Sale Reversed: $${sale.amount} from ${contact.name}`
        : `Sale Recorded: $${sale.amount} from ${contact.name}`,

      personId: sale.contactId,
      leadId: sale.leadId || undefined,
      saleId: sale.id,

      attentionItemState: isReversed ? AttentionItemState.NEEDS_ACTION : undefined,
    }

    await BaseProjector.upsertActivity(data)
  }
}
