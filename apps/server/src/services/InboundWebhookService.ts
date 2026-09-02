import { timingSafeEqual } from 'node:crypto'
import { db } from '@project/db'
import type { ExternalEventType } from '@prisma/client'
import { readCreds } from './CrmOAuthService'
import { ExternalEventService } from './ExternalEventService'

const events = new ExternalEventService()

function matchesSecret(expected: string, actual: string) {
  const left = Buffer.from(expected)
  const right = Buffer.from(actual)
  return left.length === right.length && timingSafeEqual(left, right)
}

function message(err: unknown) {
  return (
    err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err)
  ).slice(0, 2000)
}

export class InboundWebhookService {
  async ingest(
    integrationId: string,
    authorization: string | undefined,
    input: {
      eventId: string
      type?: ExternalEventType
      occurredAt?: string
      amount?: number
      productOrService?: string
      contact: {
        externalId?: string
        name?: string
        email?: string
        phone?: string
        company?: string
      }
      payload?: unknown
    },
  ) {
    const integration = await db.integration.findFirst({
      where: { id: integrationId, provider: 'WEBHOOK', status: 'CONNECTED' },
    })
    const supplied = authorization?.replace(/^Bearer\s+/i, '') ?? ''
    const expected = integration ? readCreds(integration.credentialsEnc)?.accessToken : null
    if (!integration || !expected || !matchesSecret(expected, supplied)) {
      throw { statusCode: 401, message: 'Invalid inbound webhook credentials' }
    }

    await db.integration.update({
      where: { id: integration.id },
      data: { lastSyncAttemptAt: new Date(), lastSyncError: null },
    })
    try {
      const row = await events.ingest(integration.businessId, {
        integrationId: integration.id,
        type: input.type ?? 'CONTACT_UPDATED',
        externalEventId: input.eventId,
        occurredAt: input.occurredAt,
        amount: input.amount,
        productOrService: input.productOrService,
        contact: input.contact,
        payload: input.payload ?? input,
      })
      await db.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      })
      return row
    } catch (err) {
      await db.integration.update({
        where: { id: integration.id },
        data: { lastSyncError: message(err) },
      })
      throw err
    }
  }
}
