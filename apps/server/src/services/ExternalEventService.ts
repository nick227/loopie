import { db } from '@project/db'
import type { CrmProvider, ExternalEventType } from '@prisma/client'
import { resolveContact } from '../lib/identityResolution'
import { integrationScope } from '../lib/crm/catalog'
import { catalogEntry } from '../lib/crm/catalog'
import { SaleService } from './SaleService'

const saleService = new SaleService()

const ORDER_TYPES: ExternalEventType[] = ['ORDER_CREATED', 'PAYMENT_COMPLETED']
const DEAL_TYPES: ExternalEventType[] = ['DEAL_WON']
const SALE_TYPES: ExternalEventType[] = [...ORDER_TYPES, ...DEAL_TYPES]

function toDTO(row: {
  id: string
  businessId: string
  integrationId: string | null
  contactId: string | null
  saleId: string | null
  provider: CrmProvider
  type: ExternalEventType
  externalEventId: string
  occurredAt: Date
  createdAt: Date
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    integrationId: row.integrationId,
    contactId: row.contactId,
    saleId: row.saleId,
    provider: row.provider,
    type: row.type,
    externalEventId: row.externalEventId,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export class ExternalEventService {
  async ingest(
    businessId: string,
    input: {
      integrationId: string
      type: ExternalEventType
      externalEventId: string
      occurredAt?: string
      amount?: number
      productOrService?: string
      contact?: {
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
      where: { id: input.integrationId, businessId },
    })
    if (!integration) throw { statusCode: 404, message: 'Integration not found' }
    const caps = catalogEntry(integration.provider)?.capabilities
    if (ORDER_TYPES.includes(input.type) && caps && !caps.orders && !caps.payments) {
      throw { statusCode: 400, message: 'This integration does not expose order or payment events' }
    }
    if (DEAL_TYPES.includes(input.type) && caps && !caps.deals) {
      throw { statusCode: 400, message: 'This integration does not expose deal events' }
    }

    const scopeKey = integrationScope(integration.id)
    const existing = await db.externalEvent.findUnique({
      where: { scopeKey_externalEventId: { scopeKey, externalEventId: input.externalEventId } },
    })
    if (existing) {
      if (
        SALE_TYPES.includes(existing.type) &&
        !existing.saleId &&
        existing.contactId &&
        input.amount != null
      ) {
        return toDTO(
          await this.attachSale(
            existing.id,
            businessId,
            existing.contactId,
            integration.provider,
            input,
          ),
        )
      }
      return toDTO(existing)
    }

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
    const contactPayload = input.contact
    let contactId: string | null = null
    if (
      contactPayload &&
      (contactPayload.email || contactPayload.phone || contactPayload.externalId)
    ) {
      const resolved = await db.$transaction((tx) =>
        resolveContact(
          tx,
          businessId,
          {
            name: contactPayload.name ?? 'Unknown',
            email: contactPayload.email,
            phone: contactPayload.phone,
            company: contactPayload.company,
            source: integration.provider,
          },
          {
            provider: integration.provider,
            externalId: contactPayload.externalId ?? input.externalEventId,
            scopeKey,
            integrationId: integration.id,
            raw: input.payload ?? contactPayload,
          },
        ),
      )
      if (resolved.status === 'resolved') contactId = resolved.contact.id
    }

    const event = await db.externalEvent.create({
      data: {
        businessId,
        integrationId: integration.id,
        contactId,
        provider: integration.provider,
        type: input.type,
        externalEventId: input.externalEventId,
        scopeKey,
        occurredAt,
        payload: input.payload ?? undefined,
      },
    })

    if (SALE_TYPES.includes(input.type) && contactId && input.amount != null) {
      return toDTO(
        await this.attachSale(event.id, businessId, contactId, integration.provider, input),
      )
    }

    if (
      contactId &&
      input.type !== 'CONTACT_CREATED' &&
      input.type !== 'CONTACT_UPDATED' &&
      !SALE_TYPES.includes(input.type)
    ) {
      await db.interaction.create({
        data: {
          businessId,
          contactId,
          type: 'NOTE',
          metadata: {
            provider: integration.provider,
            eventType: input.type,
            externalEventId: input.externalEventId,
          },
        },
      })
    }

    return toDTO(event)
  }

  private async attachSale(
    eventId: string,
    businessId: string,
    contactId: string,
    provider: CrmProvider,
    input: {
      externalEventId: string
      amount?: number
      productOrService?: string
      occurredAt?: string
    },
  ) {
    const open = await db.lead.findFirst({ where: { contactId, openSlot: 'OPEN' } })
    const amount = input.amount
    if (amount == null) {
      return db.externalEvent.findUniqueOrThrow({ where: { id: eventId } })
    }
    let sale
    try {
      sale = await saleService.create(businessId, {
        contactId,
        leadId: open?.id,
        amount,
        date: input.occurredAt ?? new Date().toISOString(),
        productOrService: input.productOrService,
        idempotencyKey: `${provider}:${input.externalEventId}`,
        notes: `${provider} ${input.externalEventId}`,
      })
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status !== 409 || !open) throw err
      sale = await saleService.create(businessId, {
        contactId,
        amount,
        date: input.occurredAt ?? new Date().toISOString(),
        productOrService: input.productOrService,
        idempotencyKey: `${provider}:${input.externalEventId}`,
        notes: `${provider} ${input.externalEventId}`,
      })
    }
    return db.externalEvent.update({ where: { id: eventId }, data: { saleId: sale.id, contactId } })
  }
}
