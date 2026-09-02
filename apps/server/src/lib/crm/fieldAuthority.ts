export const DISPLAY_RANK = [
  'LOOPIE',
  'HUBSPOT',
  'SALESFORCE',
  'PIPEDRIVE',
  'SHOPIFY',
  'WOOCOMMERCE',
  'WEBHOOK',
  'SQUARE',
  'CSV',
] as const

export type DisplaySource = (typeof DISPLAY_RANK)[number]
export type IdentityField = 'name' | 'email' | 'phone' | 'company'

export type FieldProvenance = {
  field: IdentityField
  value: string
  source: DisplaySource
}

const PLACEHOLDER_NAMES = new Set(['', 'unknown', 'unnamed'])

export function isPlaceholderName(name: string | null | undefined) {
  return !name || PLACEHOLDER_NAMES.has(name.trim().toLowerCase())
}

/** Map stored identifier/contact source labels onto the display catalog. */
export function asDisplaySource(source: string | null | undefined): DisplaySource {
  const raw = (source ?? 'LOOPIE').toUpperCase()
  if (raw === 'CSV') return 'CSV'
  if ((DISPLAY_RANK as readonly string[]).includes(raw)) return raw as DisplaySource
  return 'LOOPIE'
}

export function rankOf(source: DisplaySource) {
  return DISPLAY_RANK.indexOf(source)
}

/**
 * Display identity is the Contact scalar, never "whoever synced last."
 * Inbound connectors may fill blanks only. Consent and lifecycle stay LOOPIE-authored.
 */
export function mayFillScalar(
  field: IdentityField,
  contact: { name: string; email: string | null; phone: string | null; company: string | null },
) {
  if (field === 'name') return isPlaceholderName(contact.name)
  if (field === 'email') return !contact.email
  if (field === 'phone') return !contact.phone
  return !contact.company
}

export function provenanceFor(
  contact: {
    name: string
    email: string | null
    phone: string | null
    company: string | null
    source: string | null
  },
  identifiers: {
    kind: 'EMAIL' | 'PHONE'
    normalizedValue: string
    source: string
    isPrimary: boolean
  }[],
): FieldProvenance[] {
  const firstSeen = asDisplaySource(contact.source)
  const rows: FieldProvenance[] = []
  if (!isPlaceholderName(contact.name)) {
    rows.push({ field: 'name', value: contact.name, source: firstSeen })
  }
  if (contact.email) {
    const ident = identifiers.find((i) => i.kind === 'EMAIL' && i.normalizedValue === contact.email)
    rows.push({
      field: 'email',
      value: contact.email,
      source: ident ? asDisplaySource(ident.source) : firstSeen,
    })
  }
  if (contact.phone) {
    const ident = identifiers.find((i) => i.kind === 'PHONE' && i.normalizedValue === contact.phone)
    rows.push({
      field: 'phone',
      value: contact.phone,
      source: ident ? asDisplaySource(ident.source) : firstSeen,
    })
  }
  if (contact.company) {
    rows.push({ field: 'company', value: contact.company, source: firstSeen })
  }
  return rows
}
