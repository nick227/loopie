import { createHash, randomBytes } from 'crypto'

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function randomSessionToken() {
  return randomBytes(32).toString('hex')
}
