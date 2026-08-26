export type ConnectStatus = 'NOT_CONNECTED' | 'ONBOARDING' | 'READY' | 'RESTRICTED'

export const CONNECT_STATUS_LABEL: Record<ConnectStatus, string> = {
  NOT_CONNECTED: 'Not connected',
  ONBOARDING: 'Onboarding',
  READY: 'Ready',
  RESTRICTED: 'Restricted',
}

export function connectStatus(row: {
  stripeConnectAccountId: string | null
  stripePayoutsEnabled: boolean
  stripeDetailsSubmitted: boolean
}): ConnectStatus {
  if (!row.stripeConnectAccountId) return 'NOT_CONNECTED'
  if (row.stripePayoutsEnabled) return 'READY'
  if (row.stripeDetailsSubmitted) return 'RESTRICTED'
  return 'ONBOARDING'
}

export function connectFieldsFromAccount(account: {
  id: string
  payouts_enabled?: boolean | null
  details_submitted?: boolean | null
  requirements?: { disabled_reason?: string | null } | null
}) {
  return {
    stripeConnectAccountId: account.id,
    stripePayoutsEnabled: Boolean(account.payouts_enabled),
    stripeDetailsSubmitted: Boolean(account.details_submitted),
    stripeDisabledReason: account.requirements?.disabled_reason ?? null,
  }
}
