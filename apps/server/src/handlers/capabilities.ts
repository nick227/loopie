// Relative path, not the '@project/sdk' package specifier — see AdRunService.ts's identical
// import for why (found live: MODULE_NOT_FOUND in the Railway runtime image despite the file
// physically being present, specific to this package's #exports-map package.json).
import { PLATFORM_CAPABILITIES } from '../../../../packages/sdk/src/lib/capabilities'

export async function getPlatformCapabilities(request: any, reply: any) {
  return reply.send(PLATFORM_CAPABILITIES)
}
