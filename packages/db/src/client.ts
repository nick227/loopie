import { PrismaClient } from '@prisma/client'

declare global {
  // `var` is required here, not stylistic — global augmentation only attaches to the actual
  // global object via `var`; `let`/`const` would create a block-scoped binding `global.__db`
  // can't see. Standard Prisma singleton-across-hot-reloads pattern.
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined
}

export const db = global.__db ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__db = db
}

export { issueSid, verifySid, resolveVisitorSid } from './signedSid'
export { hashSessionToken, randomSessionToken } from './sessionToken'
export { consumeRateLimit, cleanupExpiredRateLimitBuckets, type RateLimitResult } from './rateLimit'
export { assertTestDatabaseUrl } from './testGuard'
export { withSid, clickRedirectUrl, trackBaseClick, isCampaignEnded } from './tracking'
export { absoluteMediaUrl } from './mediaUrl'
export { SYSTEM_LEAD_GEN_TEMPLATE_ID, SYSTEM_LEAD_GEN_SCHEMA } from './leadGenTemplate'
