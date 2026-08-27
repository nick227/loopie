import { normalizeImportContact, type NormalizedImportContact } from './importContactSchema'

const MAX_ROWS = 5000

export type ContactImportFormat = 'csv' | 'json'

export type ParsedContactImport = {
  format: ContactImportFormat
  rows: NormalizedImportContact[]
}

export class ContactImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContactImportError'
  }
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let i = 0
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  while (i < source.length) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        continue
      }
      cell += char
      i++
      continue
    }
    if (char === '"') {
      quoted = true
      i++
      continue
    }
    if (char === ',' || char === '\t') {
      row.push(cell)
      cell = ''
      i++
      continue
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      i++
      continue
    }
    cell += char
    i++
  }
  row.push(cell)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

function rowsFromCsv(text: string): Record<string, unknown>[] {
  const table = parseCsvRows(text)
  const headers = table[0]
  if (!headers || headers.length === 0) throw new ContactImportError('CSV is missing a header row.')
  return table.slice(1).map((cells) => {
    const row: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      if (header.trim()) row[header.trim()] = cells[index] ?? ''
    })
    return row
  })
}

function rowsFromJson(text: string): Record<string, unknown>[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length > 1 && lines.every((line) => line.startsWith('{'))) {
      return lines.map((line) => JSON.parse(line) as Record<string, unknown>)
    }
    throw new ContactImportError(
      'JSON is not valid. Use an array of objects, or { "contacts": [...] }.',
    )
  }
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
  if (parsed && typeof parsed === 'object') {
    const body = parsed as Record<string, unknown>
    if (Array.isArray(body.contacts)) return body.contacts as Record<string, unknown>[]
    return [body]
  }
  throw new ContactImportError('JSON must be an array of people.')
}

export function detectContactImportFormat(text: string): ContactImportFormat {
  const trimmed = text.trim()
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return 'json'
  return 'csv'
}

export function parseContactImport(
  text: string,
  format?: ContactImportFormat,
): ParsedContactImport {
  const trimmed = text.trim()
  if (!trimmed) throw new ContactImportError('Paste CSV or JSON, or choose a file.')
  const resolved = format ?? detectContactImportFormat(trimmed)
  const raw = resolved === 'json' ? rowsFromJson(trimmed) : rowsFromCsv(trimmed)
  if (raw.length === 0) throw new ContactImportError('No people in this file.')
  if (raw.length > MAX_ROWS) throw new ContactImportError(`Import is capped at ${MAX_ROWS} people.`)
  if (raw.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new ContactImportError('Each person must be an object with named fields.')
  }
  return { format: resolved, rows: raw.map((row) => normalizeImportContact(row)) }
}

export function toImportPayload(rows: NormalizedImportContact[]) {
  return rows.map((row) => ({
    name: row.name,
    ...(row.email ? { email: row.email } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.company ? { company: row.company } : {}),
    ...(row.source ? { source: row.source } : {}),
    ...(row.tags ? { tags: row.tags } : {}),
    ...(row.emailEligible !== undefined ? { emailEligible: row.emailEligible } : {}),
    ...(row.smsEligible !== undefined ? { smsEligible: row.smsEligible } : {}),
    ...(row.externalId ? { externalId: row.externalId } : {}),
    ...(row.profile ? { profile: row.profile } : {}),
  }))
}
