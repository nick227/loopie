import { describe, expect, it } from 'vitest'
import {
  EMBED_PROTOCOL_VERSION,
  parseEmbedEventInput,
  parseEmbedIdentity,
  parseLoaderToRuntimeMessage,
  parseRuntimeToLoaderMessage,
  type EmbedIdentity,
} from './protocol'

const identity: EmbedIdentity = {
  protocolVersion: EMBED_PROTOCOL_VERSION,
  objectType: 'PAGE',
  objectId: 'page_internal_1',
  deploymentId: 'deployment_internal_1',
  versionId: 'version_internal_1',
  embedInstanceId: 'instance_internal_1',
  snapshotChecksum: 'a'.repeat(64),
}

describe('embed protocol parsers', () => {
  it('parses initialization without treating host context as identity', () => {
    expect(
      parseLoaderToRuntimeMessage({
        type: 'loopie:init',
        protocolVersion: '1',
        publicId: 'pg_abcdefgh',
        bootstrapToken: 'opaque-token',
        context: {
          hostUrl: 'https://publisher.example/offers?customer=private',
          utmSource: 'partner',
        },
      }),
    ).toMatchObject({
      type: 'loopie:init',
      publicId: 'pg_abcdefgh',
      context: { utmSource: 'partner' },
    })
  })

  it('parses a visibility message with the complete immutable identity envelope', () => {
    expect(
      parseLoaderToRuntimeMessage({
        type: 'loopie:visibility',
        identity,
        intersectionRatio: 0.5,
        visibleWidth: 300,
        visibleHeight: 250,
        durationMs: 1000,
        documentVisible: true,
      }),
    ).toEqual({
      type: 'loopie:visibility',
      identity,
      intersectionRatio: 0.5,
      visibleWidth: 300,
      visibleHeight: 250,
      durationMs: 1000,
      documentVisible: true,
    })
  })

  it('parses resize and top-level success requests', () => {
    expect(parseRuntimeToLoaderMessage({ type: 'loopie:resize', identity, height: 640 })).toEqual({
      type: 'loopie:resize',
      identity,
      height: 640,
    })
    expect(
      parseRuntimeToLoaderMessage({
        type: 'loopie:success-navigate',
        identity,
        url: 'https://example.com/thanks',
      }),
    ).toMatchObject({ type: 'loopie:success-navigate', identity })
  })

  it.each([
    [{ ...identity, protocolVersion: '2' }, 'protocol'],
    [{ ...identity, objectType: 'FORM' }, 'objectType'],
    [{ ...identity, snapshotChecksum: 'not-a-checksum' }, 'snapshotChecksum'],
  ])('rejects an invalid identity envelope', (input, expected) => {
    expect(() => parseEmbedIdentity(input)).toThrow(expected)
  })

  it.each([-0.1, 1.1, Number.NaN])('rejects invalid intersection ratio %s', (ratio) => {
    expect(() =>
      parseLoaderToRuntimeMessage({
        type: 'loopie:visibility',
        identity,
        intersectionRatio: ratio,
        visibleWidth: 1,
        visibleHeight: 1,
        durationMs: 1,
        documentVisible: true,
      }),
    ).toThrow()
  })

  it('rejects unknown message and error discriminants', () => {
    expect(() => parseLoaderToRuntimeMessage({ type: 'loopie:unknown' })).toThrow('Unknown')
    expect(() =>
      parseRuntimeToLoaderMessage({ type: 'loopie:runtime-error', code: 'SECRET_LEAK' }),
    ).toThrow('error code')
  })

  it('parses a version-bound runtime event without accepting authorization evidence', () => {
    const event = parseEmbedEventInput({
      eventId: 'event_1',
      idempotencyKey: 'instance_1:page_viewed',
      eventType: 'page_viewed',
      occurredAt: '2026-08-29T12:00:00.000Z',
      identity,
      context: { hostUrl: 'https://publisher.example/offer', utmSource: 'partner' },
      authorizedOrigin: 'https://attacker.example',
    })
    expect(event).not.toHaveProperty('authorizedOrigin')
    expect(event.identity.snapshotChecksum).toBe(identity.snapshotChecksum)
  })

  it('requires a safe reason category only for form_failed', () => {
    const base = {
      eventId: 'event_2',
      idempotencyKey: 'attempt_1:failed',
      eventType: 'form_failed',
      occurredAt: '2026-08-29T12:00:00.000Z',
      identity,
      context: {},
    }
    expect(() => parseEmbedEventInput(base)).toThrow('requires')
    expect(parseEmbedEventInput({ ...base, formFailureReason: 'SERVER_REJECTED' })).toMatchObject({
      eventType: 'form_failed',
      formFailureReason: 'SERVER_REJECTED',
    })
    expect(() =>
      parseEmbedEventInput({ ...base, formFailureReason: 'DATABASE_PASSWORD_EXPOSED' }),
    ).toThrow('failure reason')
  })

  it('rejects non-UTC or non-ISO event timestamps', () => {
    expect(() =>
      parseEmbedEventInput({
        eventId: 'event_3',
        idempotencyKey: 'event_3',
        eventType: 'embed_loaded',
        occurredAt: 'August 29, 2026',
        identity,
        context: {},
      }),
    ).toThrow('UTC ISO')
  })
})
