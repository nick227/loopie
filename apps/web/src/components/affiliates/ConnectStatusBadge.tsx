export function connectStatusLabel(status: string) {
  if (status === 'ONBOARDING') return 'Onboarding'
  if (status === 'READY') return 'Ready'
  if (status === 'RESTRICTED') return 'Restricted'
  return 'Not connected'
}

export function payoutQueueLabel(
  openPayoutStatus: string | null | undefined,
  payableMinor: number,
) {
  if (openPayoutStatus === 'PENDING') return 'Sending'
  if (openPayoutStatus === 'TRANSFERRED') return 'Transferred'
  if (payableMinor > 0) return 'Payable'
  return null
}

export function ConnectStatusBadge({ status }: { status: string }) {
  return <span className="text-xs text-muted-foreground">{connectStatusLabel(status)}</span>
}
