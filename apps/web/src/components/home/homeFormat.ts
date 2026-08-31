export function formatCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  })
    .format(value)
    .replace(/([KMBT])$/, (suffix) => suffix.toLowerCase())
}

export function formatMoney(value: number, currency = 'USD', compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact && Math.abs(value) >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : Number.isInteger(value) ? 0 : 2,
  })
    .format(value)
    .replace(/([KMBT])$/, (suffix) => suffix.toLowerCase())
}

export function relativeTime(value: string, now = Date.now()) {
  const delta = Math.max(0, now - new Date(value).getTime())
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function relativeTimeLabel(value: string, now = Date.now()) {
  const delta = Math.max(0, now - new Date(value).getTime())
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
