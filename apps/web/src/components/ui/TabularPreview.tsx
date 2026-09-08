/** Portable raw-data preview shared by importers. Values remain text, including formulas. */
export function TabularPreview({
  headers,
  rows,
  caption = 'Source data preview',
  firstRow = 2,
}: {
  headers: string[]
  rows: readonly (readonly unknown[])[]
  caption?: string
  firstRow?: number
}) {
  return (
    <div
      className="max-h-80 overflow-auto rounded-lg border"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full border-collapse whitespace-nowrap text-left text-sm">
        <caption className="p-3 text-left text-xs text-muted-foreground">{caption}</caption>
        <thead className="sticky top-0 bg-card">
          <tr>
            <th scope="col" className="border-b p-2 text-muted-foreground">
              Row
            </th>
            {headers.map((header, index) => (
              <th scope="col" className="border-b border-l p-2 font-medium" key={index}>
                {header || `Column ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <th scope="row" className="border-b p-2 font-mono text-xs text-muted-foreground">
                {firstRow + index}
              </th>
              {headers.map((_, column) => (
                <td
                  key={column}
                  className="max-w-80 truncate border-b border-l p-2"
                  title={String(row[column] ?? '')}
                >
                  {String(row[column] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="p-3 text-sm text-muted-foreground">No data rows in this tab.</p>
      )}
    </div>
  )
}
