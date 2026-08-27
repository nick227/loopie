import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  parseContactImport,
  SAMPLE_CSV,
  SAMPLE_JSON,
  toImportPayload,
  useImportContacts,
  type ContactImportFormat,
  type NormalizedImportContact,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { CrmNav } from '@/pages/crm/CrmNav'
import { ImportSchemaCard } from './ImportSchemaCard'

export function ImportContactsPage() {
  const navigate = useNavigate()
  const mutation = useImportContacts()
  const [format, setFormat] = useState<ContactImportFormat>('csv')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo(() => {
    if (!text.trim()) return null
    try {
      return parseContactImport(text, format)
    } catch {
      try {
        return parseContactImport(text)
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Could not parse this file.' }
      }
    }
  }, [format, text])

  const rows: NormalizedImportContact[] | null = parsed && 'rows' in parsed ? parsed.rows : null
  const parseError = parsed && 'error' in parsed ? parsed.error : null

  async function onFile(file: File) {
    const nextFormat: ContactImportFormat = file.name.toLowerCase().endsWith('.json')
      ? 'json'
      : 'csv'
    setFormat(nextFormat)
    setText(await file.text())
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import people</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV or JSON. Writes the same graph as HubSpot or Shopify — no duplicate people, existing
          identity fields stay put.
        </p>
      </div>
      <CrmNav />

      <div className="flex gap-1">
        {(['csv', 'json'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFormat(option)}
            className={
              format === option
                ? 'rounded-md bg-secondary px-3 py-1.5 text-sm'
                : 'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>

      <label
        className="block cursor-pointer rounded-xl border border-dashed border-input-border bg-surface/30 px-4 py-6 text-center text-sm text-muted-foreground hover:border-border"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const file = event.dataTransfer.files[0]
          if (file) void onFile(file)
        }}
      >
        Drop a .csv or .json file, or click to choose
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void onFile(file)
          }}
        />
      </label>

      <Textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setError(null)
        }}
        rows={10}
        className="font-mono text-sm"
        placeholder={format === 'csv' ? SAMPLE_CSV : SAMPLE_JSON}
      />

      {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rows ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">
              {rows.length} {rows.length === 1 ? 'person' : 'people'} ready
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Name</th>
                    <th className="py-1 pr-3 font-medium">Email</th>
                    <th className="py-1 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, index) => (
                    <tr
                      key={`${row.email ?? row.phone ?? row.externalId ?? index}`}
                      className="border-t border-border/60"
                    >
                      <td className="py-1.5 pr-3">{row.name}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{row.email ?? '—'}</td>
                      <td className="py-1.5 text-muted-foreground">{row.phone ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 8 ? (
              <p className="text-xs text-muted-foreground">+{rows.length - 8} more</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Button
        type="button"
        loading={mutation.isPending}
        disabled={!rows || rows.length === 0}
        onClick={async () => {
          if (!rows) return
          setError(null)
          try {
            const result = await mutation.mutateAsync({ contacts: toImportPayload(rows) })
            const counts = result.data
            if (!counts) throw new Error('Import did not return a result')
            toast.success(
              `${counts.created} new, ${counts.linked} linked` +
                (counts.skipped ? `, ${counts.skipped} skipped` : '') +
                (counts.ambiguous ? `, ${counts.ambiguous} to review` : ''),
            )
            navigate('/contacts', { replace: true })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed')
          }
        }}
      >
        {rows ? `Import ${rows.length} ${rows.length === 1 ? 'person' : 'people'}` : 'Import'}
      </Button>

      <ImportSchemaCard />
    </div>
  )
}
