import { IMPORT_CONTACT_FIELDS } from './importContactFields'

export type { ImportField, ImportFieldGroup } from './importContactFields'
export { IMPORT_CONTACT_FIELDS, SAMPLE_CSV, SAMPLE_JSON } from './importContactFields'

const PROFILE_KEYS = new Set(
  IMPORT_CONTACT_FIELDS.filter((field) => field.group === 'profile').map((field) => field.key),
)

export function foldHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const HEADER_TO_KEY = new Map<string, string>()
for (const field of IMPORT_CONTACT_FIELDS) {
  HEADER_TO_KEY.set(foldHeader(field.key), field.key)
  for (const alias of field.aliases) HEADER_TO_KEY.set(foldHeader(alias), field.key)
}

export function resolveImportHeader(header: string) {
  return HEADER_TO_KEY.get(foldHeader(header))
}

export type NormalizedImportContact = {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: string
  tags?: string[]
  emailEligible?: boolean
  smsEligible?: boolean
  externalId?: string
  profile?: Record<string, string>
}

function asText(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'object') return undefined
  const text = String(value).trim()
  return text === '' ? undefined : text
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  const text = asText(value)?.toLowerCase()
  if (!text) return undefined
  if (['true', 'yes', 'y', '1'].includes(text)) return true
  if (['false', 'no', 'n', '0'].includes(text)) return false
  return undefined
}

function asTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const tags = value.map((item) => String(item).trim()).filter(Boolean)
    return tags.length ? tags : undefined
  }
  const text = asText(value)
  if (!text) return undefined
  const tags = text
    .split(/[,|;]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return tags.length ? tags : undefined
}

function collectMapped(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {}
  const leftover: Record<string, string> = {}
  for (const [header, value] of Object.entries(row)) {
    if (
      foldHeader(header) === 'profile' &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      mapped.profile = value
      continue
    }
    const key = resolveImportHeader(header)
    if (!key) {
      const text = asText(value)
      if (text) leftover[header] = text
      continue
    }
    mapped[key] = value
  }
  return { mapped, leftover }
}

export function normalizeImportContact(row: Record<string, unknown>): NormalizedImportContact {
  const { mapped, leftover } = collectMapped(row)
  const firstName = asText(mapped.firstName)
  const lastName = asText(mapped.lastName)
  const name =
    (asText(mapped.name) ?? [firstName, lastName].filter(Boolean).join(' ').trim()) || 'Unknown'
  const phone = asText(mapped.phone) ?? asText(mapped.mobile)
  const profile: Record<string, string> = { ...leftover }
  if (typeof mapped.profile === 'object' && mapped.profile && !Array.isArray(mapped.profile)) {
    for (const [key, value] of Object.entries(mapped.profile as Record<string, unknown>)) {
      const text = asText(value)
      if (text) profile[key] = text
    }
  }
  for (const key of PROFILE_KEYS) {
    const text = asText(mapped[key])
    if (text) profile[key] = text
  }
  return {
    name,
    email: asText(mapped.email),
    phone,
    company: asText(mapped.company),
    source: asText(mapped.source),
    tags: asTags(mapped.tags),
    emailEligible: asBoolean(mapped.emailEligible),
    smsEligible: asBoolean(mapped.smsEligible),
    externalId: asText(mapped.externalId),
    ...(Object.keys(profile).length ? { profile } : {}),
  }
}

export function profileFromRaw(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const row = raw as Record<string, unknown>
  if (row.profile && typeof row.profile === 'object' && !Array.isArray(row.profile)) {
    return normalizeImportContact({ profile: row.profile }).profile
  }
  const nested = Object.values(row).some((value) => value && typeof value === 'object')
  if (nested) return undefined
  return normalizeImportContact(row).profile
}
