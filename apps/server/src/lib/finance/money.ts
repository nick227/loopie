const CURRENCY_RE = /^[A-Z]{3}$/

export function requireAmountMinor(amountMinor: number): number {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw { statusCode: 400, message: 'amountMinor must be a positive integer' }
  }
  return amountMinor
}

export function requireCurrency(currency: string): string {
  const normalized = currency.toUpperCase()
  if (!CURRENCY_RE.test(normalized)) {
    throw { statusCode: 400, message: 'currency must be a 3-letter ISO code' }
  }
  return normalized
}

export function requireIdempotencyKey(idempotencyKey: string): string {
  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw { statusCode: 400, message: 'idempotencyKey is required' }
  }
  return idempotencyKey
}

export function requireMoney(input: { amountMinor: number; currency: string; idempotencyKey: string }) {
  return {
    amountMinor: requireAmountMinor(input.amountMinor),
    currency: requireCurrency(input.currency),
    idempotencyKey: requireIdempotencyKey(input.idempotencyKey),
  }
}
