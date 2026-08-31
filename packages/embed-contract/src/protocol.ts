export const EMBED_PROTOCOL_VERSION = '1' as const

export type EmbedObjectType = 'PAGE' | 'ADVERTISEMENT'

export type EmbedIdentity = {
  protocolVersion: typeof EMBED_PROTOCOL_VERSION
  objectType: EmbedObjectType
  objectId: string
  deploymentId: string
  versionId: string
  embedInstanceId: string
  snapshotChecksum: string
}

export type AttributionContext = {
  hostUrl?: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  attributionSession?: string
}

export type LoaderToRuntimeMessage =
  | {
      type: 'loopie:init'
      protocolVersion: typeof EMBED_PROTOCOL_VERSION
      publicId: string
      bootstrapToken: string
      context: AttributionContext
    }
  | {
      type: 'loopie:visibility'
      identity: EmbedIdentity
      intersectionRatio: number
      visibleWidth: number
      visibleHeight: number
      durationMs: number
      documentVisible: boolean
    }

export type RuntimeToLoaderMessage =
  | {
      type: 'loopie:ready'
      protocolVersion: typeof EMBED_PROTOCOL_VERSION
      publicId: string
    }
  | { type: 'loopie:resize'; identity: EmbedIdentity; height: number }
  | { type: 'loopie:success-navigate'; identity: EmbedIdentity; url: string }
  | {
      type: 'loopie:runtime-error'
      identity?: EmbedIdentity
      code: RuntimeErrorCode
    }

export type RuntimeErrorCode =
  'AUTHORIZATION_FAILED' | 'PROTOCOL_MISMATCH' | 'RESOLUTION_FAILED' | 'RENDER_FAILED'

export const EMBED_EVENT_TYPES = [
  'embed_loaded',
  'page_viewed',
  'form_started',
  'form_submitted',
  'form_succeeded',
  'form_failed',
  'ad_loaded',
  'ad_impression',
  'ad_clicked',
] as const

export type EmbedEventType = (typeof EMBED_EVENT_TYPES)[number]

export type FormFailureReason = 'CLIENT_VALIDATION' | 'NETWORK' | 'SERVER_REJECTED' | 'SERVER_ERROR'

export type EmbedEventInput = {
  eventId: string
  idempotencyKey: string
  eventType: EmbedEventType
  occurredAt: string
  identity: EmbedIdentity
  context: AttributionContext
  submissionAttemptId?: string
  clickId?: string
  formFailureReason?: FormFailureReason
}

type UnknownRecord = Record<string, unknown>

function record(value: unknown, name: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`)
  }
  return value as UnknownRecord
}

function string(value: unknown, name: string, maximum = 512): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new TypeError(`${name} must be a non-empty string of at most ${maximum} characters`)
  }
  return value
}

function optionalString(value: unknown, name: string, maximum: number): string | undefined {
  return value === undefined ? undefined : string(value, name, maximum)
}

function finiteNonNegative(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number`)
  }
  return value
}

function protocolVersion(value: unknown): typeof EMBED_PROTOCOL_VERSION {
  if (value !== EMBED_PROTOCOL_VERSION) throw new TypeError('Unsupported embed protocol version')
  return EMBED_PROTOCOL_VERSION
}

function publicId(value: unknown): string {
  const parsed = string(value, 'publicId', 132)
  if (!/^(pg|ad)_[A-Za-z0-9_-]{8,128}$/.test(parsed)) {
    throw new TypeError('publicId must be a typed opaque Page or Advertisement deployment ID')
  }
  return parsed
}

export function parseEmbedIdentity(value: unknown): EmbedIdentity {
  const input = record(value, 'identity')
  const objectType = input.objectType
  if (objectType !== 'PAGE' && objectType !== 'ADVERTISEMENT') {
    throw new TypeError('identity.objectType is invalid')
  }
  const checksum = string(input.snapshotChecksum, 'identity.snapshotChecksum', 64)
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new TypeError('identity.snapshotChecksum is invalid')
  return {
    protocolVersion: protocolVersion(input.protocolVersion),
    objectType,
    objectId: string(input.objectId, 'identity.objectId'),
    deploymentId: string(input.deploymentId, 'identity.deploymentId'),
    versionId: string(input.versionId, 'identity.versionId'),
    embedInstanceId: string(input.embedInstanceId, 'identity.embedInstanceId'),
    snapshotChecksum: checksum,
  }
}

export function parseAttributionContext(value: unknown): AttributionContext {
  const input = record(value, 'context')
  return {
    hostUrl: optionalString(input.hostUrl, 'context.hostUrl', 4096),
    referrer: optionalString(input.referrer, 'context.referrer', 4096),
    utmSource: optionalString(input.utmSource, 'context.utmSource', 512),
    utmMedium: optionalString(input.utmMedium, 'context.utmMedium', 512),
    utmCampaign: optionalString(input.utmCampaign, 'context.utmCampaign', 512),
    attributionSession: optionalString(
      input.attributionSession,
      'context.attributionSession',
      4096,
    ),
  }
}

export function parseLoaderToRuntimeMessage(value: unknown): LoaderToRuntimeMessage {
  const input = record(value, 'message')
  if (input.type === 'loopie:init') {
    return {
      type: input.type,
      protocolVersion: protocolVersion(input.protocolVersion),
      publicId: publicId(input.publicId),
      bootstrapToken: string(input.bootstrapToken, 'bootstrapToken', 4096),
      context: parseAttributionContext(input.context),
    }
  }
  if (input.type === 'loopie:visibility') {
    const ratio = finiteNonNegative(input.intersectionRatio, 'intersectionRatio')
    if (ratio > 1) throw new TypeError('intersectionRatio cannot exceed 1')
    if (typeof input.documentVisible !== 'boolean') {
      throw new TypeError('documentVisible must be boolean')
    }
    return {
      type: input.type,
      identity: parseEmbedIdentity(input.identity),
      intersectionRatio: ratio,
      visibleWidth: finiteNonNegative(input.visibleWidth, 'visibleWidth'),
      visibleHeight: finiteNonNegative(input.visibleHeight, 'visibleHeight'),
      durationMs: finiteNonNegative(input.durationMs, 'durationMs'),
      documentVisible: input.documentVisible,
    }
  }
  throw new TypeError('Unknown loader-to-runtime message type')
}

export function parseRuntimeToLoaderMessage(value: unknown): RuntimeToLoaderMessage {
  const input = record(value, 'message')
  if (input.type === 'loopie:ready') {
    return {
      type: input.type,
      protocolVersion: protocolVersion(input.protocolVersion),
      publicId: publicId(input.publicId),
    }
  }
  if (input.type === 'loopie:resize') {
    return {
      type: input.type,
      identity: parseEmbedIdentity(input.identity),
      height: finiteNonNegative(input.height, 'height'),
    }
  }
  if (input.type === 'loopie:success-navigate') {
    return {
      type: input.type,
      identity: parseEmbedIdentity(input.identity),
      url: string(input.url, 'url', 4096),
    }
  }
  if (input.type === 'loopie:runtime-error') {
    const codes = new Set<RuntimeErrorCode>([
      'AUTHORIZATION_FAILED',
      'PROTOCOL_MISMATCH',
      'RESOLUTION_FAILED',
      'RENDER_FAILED',
    ])
    const code = input.code as RuntimeErrorCode
    if (!codes.has(code)) throw new TypeError('Unknown runtime error code')
    return {
      type: input.type,
      ...(input.identity === undefined ? {} : { identity: parseEmbedIdentity(input.identity) }),
      code,
    }
  }
  throw new TypeError('Unknown runtime-to-loader message type')
}

export function parseEmbedEventInput(value: unknown): EmbedEventInput {
  const input = record(value, 'event')
  if (!EMBED_EVENT_TYPES.includes(input.eventType as EmbedEventType)) {
    throw new TypeError('Unknown embed event type')
  }
  const occurredAt = string(input.occurredAt, 'occurredAt', 64)
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(occurredAt) ||
    Number.isNaN(Date.parse(occurredAt))
  ) {
    throw new TypeError('occurredAt must be a UTC ISO date-time')
  }

  const failureReasons = new Set<FormFailureReason>([
    'CLIENT_VALIDATION',
    'NETWORK',
    'SERVER_REJECTED',
    'SERVER_ERROR',
  ])
  const formFailureReason = input.formFailureReason as FormFailureReason | undefined
  if (formFailureReason !== undefined && !failureReasons.has(formFailureReason)) {
    throw new TypeError('Unknown form failure reason')
  }
  if (input.eventType === 'form_failed' && formFailureReason === undefined) {
    throw new TypeError('form_failed requires formFailureReason')
  }
  if (input.eventType !== 'form_failed' && formFailureReason !== undefined) {
    throw new TypeError('formFailureReason is valid only for form_failed')
  }

  return {
    eventId: string(input.eventId, 'eventId'),
    idempotencyKey: string(input.idempotencyKey, 'idempotencyKey'),
    eventType: input.eventType as EmbedEventType,
    occurredAt,
    identity: parseEmbedIdentity(input.identity),
    context: parseAttributionContext(input.context),
    submissionAttemptId: optionalString(input.submissionAttemptId, 'submissionAttemptId', 512),
    clickId: optionalString(input.clickId, 'clickId', 512),
    formFailureReason,
  }
}
