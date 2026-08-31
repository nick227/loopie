import { PlatformConnectionService } from '../services/PlatformConnectionService'
import { DeploymentPushService } from '../services/DeploymentPushService'

const platformService = new PlatformConnectionService()
const pushService = new DeploymentPushService()

export async function getPlatformConnection(
  request: { user: { businessId: string }; params: { platform: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await platformService.get(request.user.businessId, request.params.platform)
  return reply.send({ data })
}

export async function updatePlatformConnection(
  request: {
    user: { businessId: string }
    params: { platform: string }
    body: { adAccountId?: string; pageId?: string; defaultCountry?: string }
  },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await platformService.update(
    request.user.businessId,
    request.params.platform,
    request.body,
  )
  return reply.send({ data })
}

export async function disconnectPlatformConnection(
  request: { user: { businessId: string }; params: { platform: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await platformService.disconnect(request.user.businessId, request.params.platform)
  return reply.send({ data })
}

export async function startPlatformOAuth(
  request: {
    user: { businessId: string }
    params: { platform: string }
    query: { returnPath?: string }
  },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await platformService.startOAuth(
    request.user.businessId,
    request.params.platform,
    request.query.returnPath,
  )
  return reply.send({ data })
}

export async function handlePlatformOAuthCallback(
  request: { params: { platform: string }; query: { code?: string; state?: string } },
  reply: {
    header: (name: string, value: string) => { redirect: (code: number, url: string) => unknown }
  },
) {
  const redirectUrl = await platformService.handleCallback(
    request.params.platform,
    request.query.code,
    request.query.state,
  )
  return reply.header('Cache-Control', 'no-store').redirect(302, redirectUrl)
}

export async function listPlatformAccounts(
  request: { user: { businessId: string }; params: { platform: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await platformService.listAccounts(request.user.businessId, request.params.platform)
  return reply.send({ data })
}

export async function listPlatformPages(
  request: { user: { businessId: string }; params: { platform: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await platformService.listPages(request.user.businessId, request.params.platform)
  return reply.send({ data })
}

export async function pushDeployment(
  request: { user: { businessId: string }; params: { deploymentId: string } },
  reply: { send: (body: unknown) => unknown },
) {
  const data = await pushService.push(request.user.businessId, request.params.deploymentId)
  return reply.send({ data })
}
