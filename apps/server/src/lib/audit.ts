import { db } from '@project/db'
import type { AuthUser } from './membership'

export const AuditActions = {
  LICENSE_GRANTED: 'LICENSE_GRANTED',
  LICENSE_UPDATED: 'LICENSE_UPDATED',
  LICENSE_SUSPENDED: 'LICENSE_SUSPENDED',
  LICENSE_REACTIVATED: 'LICENSE_REACTIVATED',
  MEMBER_INVITED: 'MEMBER_INVITED',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  PLATFORM_ROLE_CHANGED: 'PLATFORM_ROLE_CHANGED',
  AFFILIATE_ATTRIBUTION_CREATED: 'AFFILIATE_ATTRIBUTION_CREATED',
  AFFILIATE_ATTRIBUTION_REASSIGNED: 'AFFILIATE_ATTRIBUTION_REASSIGNED',
} as const

export const AuditResourceTypes = {
  BUSINESS_LICENSE: 'BUSINESS_LICENSE',
  BUSINESS_MEMBERSHIP: 'BUSINESS_MEMBERSHIP',
  USER: 'USER',
  PLATFORM_AFFILIATE_ATTRIBUTION: 'PLATFORM_AFFILIATE_ATTRIBUTION',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]
export type AuditResourceType = (typeof AuditResourceTypes)[keyof typeof AuditResourceTypes]

/** The minimal actor shape emitAuditEvent actually reads — narrower than the full AuthUser so
 * callers without a complete membership-resolved user (e.g. a just-registered account, before its
 * membership/business context is assembled) can still attribute an audit event to themselves. */
export type AuditActor = Pick<AuthUser, 'id' | 'platformRole'> &
  Partial<Pick<AuthUser, 'supportSessionId'>>

type EmitAuditEventArgs = {
  actor: AuditActor
  action: AuditAction | string
  resourceType: AuditResourceType | string
  resourceId?: string
  businessId?: string
  metadata?: Record<string, any>
}

export async function emitAuditEvent({
  actor,
  action,
  resourceType,
  resourceId,
  businessId,
  metadata = {},
}: EmitAuditEventArgs) {
  try {
    await db.auditEvent.create({
      data: {
        actorUserId: actor.id,
        actorPlatformRole: actor.platformRole,
        action,
        resourceType,
        resourceId,
        businessId,
        metadata,
        supportSessionId: actor.supportSessionId ?? null,
      },
    })
  } catch (err) {
    // Audit emission failure should not crash the primary action.
    console.error('Failed to emit audit event:', err)
  }
}
