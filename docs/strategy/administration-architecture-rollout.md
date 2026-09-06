# LOOPIE Administration Architecture & Rollout

## Executive Summary

LOOPIE functions as a unified "Creative to Close" operating system. To manage this effectively, we must establish clear boundaries between **Business Administration** (tenant-scoped ownership) and **Site Administration** (platform-scoped oversight).

**Architectural Principle: Site administrators may enter a business context, but they never become members or owners of that business.**

This single invariant will protect the tenant model as the platform grows. This document proposes an architecture and multi-track rollout strategy that separates these worlds, consolidates existing tenant-management features into a streamlined UX, and provisions secure oversight tools for LOOPIE operators.

## Core Conceptual Model: Scopes & Roles

To prevent authorization mistakes, we must explicitly distinguish platform roles from business membership roles.

| Role                       | Scope                      | Controls                                                                                                  |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **MEMBER**                 | One business               | Normal LOOPIE work: CRM, Pages, Ads, Messaging, etc.                                                      |
| **OWNER / Business Admin** | Businesses they own/manage | Team, business identity, integrations, billing/usage, spend controls, audit history.                      |
| **SITE_ADMIN**             | Entire LOOPIE platform     | All businesses, all users, River moderation, platform configuration, account intervention, system health. |

### Proposed Data Model Alignment

```typescript
User.platformRole = 'USER' | 'SITE_ADMIN'
BusinessMembership.role = 'MEMBER' | 'OWNER'
```

Authorization will then rely on clear primitives:

- `canManageBusiness = membership.role === 'OWNER'`
- `canAdministerPlatform = user.platformRole === 'SITE_ADMIN'`

## Proposed UX Architecture

### Business Admin (Tenant Context)

**Navigation:** `Team · Business profile · Integrations · Billing & usage · Affiliates · Audit log`
Appears only in the context of the currently selected business. These destinations will focus on exceptions and actions (e.g., "Shopify sync failed", "3 seats used of 5").

### Site Admin (Platform Context)

**Navigation:** `Businesses · Users · River · Moderation · Billing/Ops · Integrations · System`
A privileged, visually distinct area (e.g., `/admin/*`) for `SITE_ADMIN` users to manage the global system. By default, `SITE_ADMIN` provides **read-only global visibility**. To mutate any data inside a tenant, the Site Admin must enter an active Support Mode session.

## Audit & Support Infrastructure

### Dedicated Audit Model

Audit logging requires dedicated backend infrastructure to answer "who changed the system?" rather than relying on the customer-facing Inbox Activity stream. Some events are platform-wide, so `businessId` is optional.

```typescript
AuditEvent {
  id
  businessId?       // null for platform-level events
  actorUserId
  actorPlatformRole
  action
  resourceType
  resourceId?
  metadata
  createdAt
}
```

### Admin Support Sessions

Support Mode must be a first-class server-side concept. When a Site Admin impersonates or enters a business context to resolve an issue, the system creates a session that has an explicit expiration to ensure support access cannot linger indefinitely:

```typescript
AdminSupportSession {
  id
  siteAdminUserId
  businessId
  reason
  startedAt
  endedAt
  expiresAt
}
```

Requests made during that session retain both identities (Actual Actor: SITE_ADMIN; Tenant Context: Acme Co; Session: `abc123`). This ensures audit records clearly show that a LOOPIE administrator performed the action, not the business owner.

## Permissions Matrix & Invariants

**Core System Invariants:**

- `SITE_ADMIN !== OWNER`
- `SITE_ADMIN` does not require BusinessMembership
- `OWNER` authority never crosses `businessId`
- `SITE_ADMIN` tenant mutations require an active `AdminSupportSession`
- Every support-session mutation creates an `AuditEvent`
- Business audit events never expose unrelated tenant data

**Permissions Matrix:**

| Action Scope                              | MEMBER | OWNER  | SITE_ADMIN (Read) | SITE_ADMIN (Support Mode) |
| ----------------------------------------- | ------ | ------ | ----------------- | ------------------------- |
| Use Business Tools (CRM, Ads, Pages)      | ✅ Yes | ✅ Yes | 👁️ Read-only      | ✅ Yes (Audited)          |
| Manage Business Settings (Billing, Team)  | ❌ No  | ✅ Yes | 👁️ Read-only      | ✅ Yes (Audited)          |
| Platform Oversight (All Users, All River) | ❌ No  | ❌ No  | ✅ Yes            | ❌ N/A                    |
| View Platform Audit Logs                  | ❌ No  | ❌ No  | ✅ Yes            | ❌ N/A                    |
| Platform Configuration & Billing Ops      | ❌ No  | ❌ No  | ✅ Yes            | ❌ N/A                    |

## Implementation Order

To ensure a safe transition and avoid accidental privilege leaks, the rollout must follow this exact order:

1. **Authorization split and migration away from legacy `ADMIN`**
2. **Centralized guards and permission tests**
3. **Business Admin consolidation**
4. **`/admin/businesses` + `/admin/users`**
5. **Audit infrastructure** (Must precede Support Mode so support actions can be audited)
6. **Support Mode**
7. **River moderation and platform operations**
