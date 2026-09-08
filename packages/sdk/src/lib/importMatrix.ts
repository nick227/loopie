/** Raw, positional source data. No field creation, formula evaluation, or writes. */
export type ImportMatrix = {
  headers: string[]
  rows: string[][]
  firstDataRow: number
  truncated: boolean
}

export function createImportMatrix(
  values: readonly (readonly unknown[])[],
  truncated = false,
): ImportMatrix {
  const width = values.reduce((max, row) => Math.max(max, row.length), 0)
  const text = (value: unknown) =>
    value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return {
    headers: Array.from({ length: width }, (_, index) => text(values[0]?.[index])),
    rows: values
      .slice(1)
      .map((row) => Array.from({ length: width }, (_, index) => text(row[index]))),
    firstDataRow: 2,
    truncated,
  }
}
