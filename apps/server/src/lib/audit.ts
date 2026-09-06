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
} as const

export const AuditResourceTypes = {
  BUSINESS_LICENSE: 'BUSINESS_LICENSE',
  BUSINESS_MEMBERSHIP: 'BUSINESS_MEMBERSHIP',
  USER: 'USER',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]
export type AuditResourceType = (typeof AuditResourceTypes)[keyof typeof AuditResourceTypes]

type EmitAuditEventArgs = {
  actor: AuthUser
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
