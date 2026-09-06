export const SAMPLE_SALE_DOLLARS = 500

export function computePreviewSplit(opts: {
  saleDollars?: number
  rateBps: number | null | undefined
  managerShareBps: number | null | undefined
  hasManager: boolean
}) {
  const saleAmountMinor = Math.round((opts.saleDollars ?? SAMPLE_SALE_DOLLARS) * 100)
  const grossCommissionMinor = Math.round(saleAmountMinor * ((opts.rateBps ?? 0) / 10000))
  const managerShareBps = opts.hasManager ? (opts.managerShareBps ?? 0) : 0
  const managerCommissionMinor = opts.hasManager
    ? Math.round((grossCommissionMinor * managerShareBps) / 10000)
    : 0
  return {
    saleAmountMinor,
    grossCommissionMinor,
    managerCommissionMinor,
    affiliateCommissionMinor: grossCommissionMinor - managerCommissionMinor,
  }
}

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
