import { IntegrationService } from '../services/IntegrationService'
import { ExternalEventService } from '../services/ExternalEventService'
import { ContactMatchService } from '../services/ContactMatchService'
import { CrmOAuthService } from '../services/CrmOAuthService'
import { CrmSyncService } from '../services/CrmSyncService'

const integrations = new IntegrationService()
const events = new ExternalEventService()
const matches = new ContactMatchService()
const oauth = new CrmOAuthService()
const sync = new CrmSyncService()

type Authed = {
  user: { businessId: string }
  params?: Record<string, string>
  query?: Record<string, string>
  body?: unknown
}
type Reply = {
  send: (body: unknown) => unknown
  status: (code: number) => { send: (body: unknown) => unknown }
  header: (name: string, value: string) => { redirect: (code: number, url: string) => unknown }
}

export async function listCrmCatalog(request: Authed, reply: Reply) {
  return reply.send(await integrations.catalog(request.user.businessId))
}

export async function listIntegrations(request: Authed, reply: Reply) {
  return reply.send(await integrations.list(request.user.businessId, request.query ?? {}))
}

export async function createIntegration(request: Authed, reply: Reply) {
  const row = await integrations.create(
    request.user.businessId,
    request.body as { provider: string; label?: string; externalAccountId?: string },
  )
  return reply.status(201).send({ data: row })
}

export async function getIntegration(request: Authed, reply: Reply) {
  return reply.send({
    data: await integrations.get(request.user.businessId, request.params!.integrationId),
  })
}

export async function updateIntegration(request: Authed, reply: Reply) {
  return reply.send({
    data: await integrations.update(
      request.user.businessId,
      request.params!.integrationId,
      request.body as { status?: 'CONNECTED' | 'PAUSED' | 'NEEDS_REAUTH'; label?: string },
    ),
  })
}

export async function startCrmOAuth(request: Authed, reply: Reply) {
  const data = await oauth.start(request.user.businessId, request.params!.provider, {
    shop: request.query?.shop,
    returnPath: request.query?.returnPath,
  })
  return reply.send({ data })
}

export async function handleCrmOAuthCallback(
  request: { params: { provider: string }; query: { code?: string; state?: string } },
  reply: Reply,
) {
  const redirectUrl = await oauth.handleCallback(
    request.params.provider,
    request.query.code,
    request.query.state,
  )
  return reply.header('Cache-Control', 'no-store').redirect(302, redirectUrl)
}

export async function syncIntegration(request: Authed, reply: Reply) {
  const data = await sync.run(request.user.businessId, request.params!.integrationId)
  return reply.send({ data })
}

export async function ingestExternalEvent(request: Authed, reply: Reply) {
  const row = await events.ingest(
    request.user.businessId,
    request.body as Parameters<ExternalEventService['ingest']>[1],
  )
  return reply.status(201).send({ data: row })
}

export async function listContactMatches(request: Authed, reply: Reply) {
  return reply.send(await matches.list(request.user.businessId, request.query ?? {}))
}

export async function resolveContactMatch(request: Authed, reply: Reply) {
  const body = request.body as { contactId: string }
  return reply.send({
    data: await matches.resolve(request.user.businessId, request.params!.recordId, body.contactId),
  })
}
