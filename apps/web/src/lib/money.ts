export function dollarsToMinor(dollars: number): number {
  if (!Number.isFinite(dollars) || dollars <= 0) {
    throw new Error('Enter an amount greater than zero')
  }
  return Math.round(dollars * 100)
}

export function formatUsd(amountMinor: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountMinor / 100)
}

export function formatBps(bps: number | null | undefined): string {
  if (bps == null) return '—'
  return `${(bps / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
}

export function formatDollars(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
