import { describe, expect, it } from 'vitest'
import { canonicalJson, type JsonValue } from './canonical'
import { snapshotChecksum } from './hash'

describe('LOOPIE Canonical JSON v1', () => {
  it('sorts object keys recursively while preserving array order and Unicode', () => {
    expect(
      canonicalJson({
        z: -0,
        m: '☃',
        a: [3, { b: true, a: null }],
      }),
    ).toBe('{"a":[3,{"a":null,"b":true}],"m":"☃","z":0}')
  })

  it('produces identical material for objects with different insertion order', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }))
  })

  it.each([
    ['undefined', undefined],
    ['non-finite number', Number.POSITIVE_INFINITY],
    ['bigint', 1n],
    ['Date', new Date('2026-01-01T00:00:00.000Z')],
  ])('rejects %s outside the JSON data model', (_name, value) => {
    expect(() => canonicalJson(value as JsonValue)).toThrow(TypeError)
  })

  it('rejects cyclic structures', () => {
    const value: Record<string, JsonValue> = {}
    value.self = value
    expect(() => canonicalJson(value)).toThrow('cyclic')
  })
})

describe('snapshot checksum golden vectors', () => {
  it('hashes a minimal Page payload deterministically', () => {
    expect(
      snapshotChecksum({
        rendererFormatVersion: 'page-embed-v1',
        payload: {
          content: { headline: 'Summer service' },
          successBehavior: { message: 'Thanks', type: 'INLINE' },
          theme: null,
        },
      }),
    ).toBe('90044ea802e75286d018b6b12fb0d2bc477746bd319ef2b8e3e2b11667f576f2')
  })

  it('hashes an Advertisement payload deterministically and retains asset order', () => {
    expect(
      snapshotChecksum({
        rendererFormatVersion: 'advertisement-embed-v1',
        payload: {
          accessibleLabel: 'Summer offer',
          assets: ['asset_b', 'asset_a'],
          destination: 'https://example.com/offer',
          dimensions: { height: 250, width: 300 },
        },
      }),
    ).toBe('ca172b7ae4aad875f68cea3526f9dd0ef615c4a34fac52b2dd9db55209d4f2fa')
  })

  it('preserves checksum identity across serialization round-trips', () => {
    const payload = {
      content: { headline: 'Summer service' },
      successBehavior: { message: 'Thanks', type: 'INLINE' },
      theme: null,
    }

    // 1. Initial canonicalization & hash
    const initialHash = snapshotChecksum({
      rendererFormatVersion: 'page-embed-v1',
      payload,
    })

    // 2. Simulate writing to JSON string and reading back (DB or network boundary)
    const storedString = JSON.stringify(payload)
    const retrievedPayload = JSON.parse(storedString)

    // 3. Re-canonicalize & hash the retrieved object
    const roundTripHash = snapshotChecksum({
      rendererFormatVersion: 'page-embed-v1',
      payload: retrievedPayload,
    })

    expect(roundTripHash).toBe(initialHash)
  })
})
