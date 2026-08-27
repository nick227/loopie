import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function key() {
  const raw = process.env.PLATFORM_TOKEN_KEY
  if (raw && raw.length >= 32) return createHash('sha256').update(raw).digest()
  const fallback = process.env.SESSION_SECRET ?? 'dev-session-secret-not-for-production'
  return createHash('sha256').update(fallback).digest()
}

export function sealToken(plaintext: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`
}

export function unsealToken(sealed: string) {
  const [ivB64, tagB64, dataB64] = sealed.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid sealed token')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
