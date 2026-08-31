import { PLATFORM_CAPABILITIES } from '@project/sdk/src/lib/capabilities'

export async function getPlatformCapabilities(request: any, reply: any) {
  return reply.send(PLATFORM_CAPABILITIES)
}
