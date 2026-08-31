import { createHash } from 'node:crypto'
import { canonicalJson, type JsonValue } from './canonical'

export const SNAPSHOT_CHECKSUM_ALGORITHM = 'sha256' as const
export const SNAPSHOT_CANONICAL_FORMAT = 'loopie-canonical-json-v1' as const

export type SnapshotChecksumInput = {
  rendererFormatVersion: string
  payload: JsonValue
}

/** Hashes the exact versioned payload consumed by a renderer. */
export function snapshotChecksum(input: SnapshotChecksumInput): string {
  const material = canonicalJson({
    canonicalFormat: SNAPSHOT_CANONICAL_FORMAT,
    rendererFormatVersion: input.rendererFormatVersion,
    payload: input.payload,
  })
  return createHash(SNAPSHOT_CHECKSUM_ALGORITHM).update(material, 'utf8').digest('hex')
}
