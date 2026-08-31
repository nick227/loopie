import { describe, expect, it } from 'vitest'
import { normalizeEmbedOrigin, originMatchesAllowlist } from './origin'

describe('normalizeEmbedOrigin', () => {
  it.each([
    ['https://EXAMPLE.com', 'https://example.com'],
    ['https://example.com:443', 'https://example.com'],
    ['https://example.com:8443', 'https://example.com:8443'],
    ['https://bücher.example', 'https://xn--bcher-kva.example'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeEmbedOrigin(input)).toBe(expected)
  })

  it('allows HTTP only for explicit local development origins', () => {
    expect(() => normalizeEmbedOrigin('http://localhost:4177')).toThrow('HTTPS')
    expect(normalizeEmbedOrigin('http://localhost:4177', { allowHttpLocalhost: true })).toBe(
      'http://localhost:4177',
    )
    expect(() => normalizeEmbedOrigin('http://example.com', { allowHttpLocalhost: true })).toThrow(
      'HTTPS',
    )
  })

  it.each([
    'https://*.example.com',
    'https://user@example.com',
    'https://example.com/path',
    'https://example.com/.',
    'https://example.com?query=1',
    'https://example.com/#fragment',
    'ftp://example.com',
    ' https://example.com',
  ])('rejects non-origin input %s', (input) => {
    expect(() => normalizeEmbedOrigin(input)).toThrow(TypeError)
  })
})

describe('originMatchesAllowlist', () => {
  const allowlist = new Set(['https://example.com', 'http://localhost:4177'])

  it('matches exact normalized origins', () => {
    expect(originMatchesAllowlist('https://EXAMPLE.com:443', allowlist)).toBe(true)
    expect(
      originMatchesAllowlist('http://localhost:4177', allowlist, { allowHttpLocalhost: true }),
    ).toBe(true)
  })

  it.each([null, undefined, '', 'null', 'https://sub.example.com', 'https://example.com:444'])(
    'fails closed for %s',
    (origin) => {
      expect(originMatchesAllowlist(origin, allowlist)).toBe(false)
    },
  )
})
