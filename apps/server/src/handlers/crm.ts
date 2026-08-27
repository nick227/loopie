import { IntegrationService } from '../services/IntegrationService'
import { ExternalEventService } from '../services/ExternalEventService'
import { ContactMatchService } from '../services/ContactMatchService'

const integrations = new IntegrationService()
const events = new ExternalEventService()
const matches = new ContactMatchService()

export async function listCrmCatalog(
  _request: unknown,
  reply: { send: (body: unknown) => unknown },
) {
  return reply.send(integrations.catalog())
}

export async function listIntegrations(request: any, reply: any) {
  return reply.send(await integrations.list(request.user.businessId, request.query))
}

export async function createIntegration(request: any, reply: any) {
  const row = await integrations.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: row })
}

export async function getIntegration(request: any, reply: any) {
  return reply.send({
    data: await integrations.get(request.user.businessId, request.params.integrationId),
  })
}

export async function updateIntegration(request: any, reply: any) {
  return reply.send({
    data: await integrations.update(
      request.user.businessId,
      request.params.integrationId,
      request.body,
    ),
  })
}

export async function ingestExternalEvent(request: any, reply: any) {
  const row = await events.ingest(request.user.businessId, request.body)
  return reply.status(201).send({ data: row })
}

export async function listContactMatches(request: any, reply: any) {
  return reply.send(await matches.list(request.user.businessId, request.query))
}

export async function resolveContactMatch(request: any, reply: any) {
  return reply.send({
    data: await matches.resolve(
      request.user.businessId,
      request.params.recordId,
      request.body.contactId,
    ),
  })
}
