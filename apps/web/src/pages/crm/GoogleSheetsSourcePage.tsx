import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  useConfirmImportSourceMapping,
  useImportSource,
  useImportSourceRuns,
  usePreviewImportSource,
  useSyncImportSource,
  type components,
} from '@project/sdk'
import { IMPORT_CONTACT_FIELDS } from '@project/sdk/src/lib/importContactSchema'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabularPreview } from '@/components/ui/TabularPreview'

type ColumnMapping = components['schemas']['GoogleColumnMapping']
const FIELDS = IMPORT_CONTACT_FIELDS.filter(
  (field) => !['mobile', 'source', 'tags', 'emailEligible', 'smsEligible'].includes(field.key),
)

export function GoogleSheetsSourcePage() {
  const { integrationId, sourceId } = useParams<{ integrationId: string; sourceId: string }>()
  const source = useImportSource(integrationId ?? null, sourceId ?? null)
  if (source.isLoading) return <Skeleton className="h-64 w-full" />
  if (source.error) return <p role="alert">{source.error.message}</p>
  const row = source.data?.data
  if (!row || !integrationId || !sourceId) return <p>Source not found.</p>
  return (
    <GoogleSheetsSourceWorkspace
      key={row.id}
      integrationId={integrationId}
      sourceId={sourceId}
      row={row}
    />
  )
}

function GoogleSheetsSourceWorkspace({
  integrationId,
  sourceId,
  row,
}: {
  integrationId: string
  sourceId: string
  row: components['schemas']['ImportSource']
}) {
  const { mutateAsync: fetchPreview } = usePreviewImportSource()
  const confirmMapping = useConfirmImportSourceMapping()
  const sync = useSyncImportSource()
  const runs = useImportSourceRuns(integrationId, sourceId)
  const [edit, setEdit] = useState<{ fingerprint: string | null; mapping: ColumnMapping } | null>(
    null,
  )
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useQuery({
    queryKey: ['import-source-preview', integrationId, sourceId, edit],
    queryFn: () => fetchPreview({ integrationId, sourceId, mapping: edit?.mapping }),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const data = preview.data?.data
  const override =
    edit && edit.fingerprint === (data?.schemaFingerprint ?? null) ? edit.mapping : undefined
  const mapping = override ?? data?.mapping
  const busy = confirmMapping.isPending || sync.isPending
  const errors =
    error ?? preview.error?.message ?? confirmMapping.error?.message ?? sync.error?.message
  const reset = () => {
    setReviewed(false)
    setError(null)
    sync.reset()
  }
  const ready = Boolean(
    data && mapping && data.eligible > 0 && !preview.isFetching && !preview.isError && !busy,
  )

  return (
    <div className="max-w-5xl space-y-5">
      <Link to={`/integrations/${integrationId}/google-sheets`} className="text-sm underline">
        Saved sources
      </Link>
      <PageHeader
        variant="detail"
        title={row.label}
        description={`${row.spreadsheetName} / ${row.sheetTab} · Import contacts for your CRM and audiences.`}
      />
      <section className="space-y-4 rounded-lg border p-4">
        {preview.isPending && <Skeleton className="h-40 w-full" />}
        {data?.schemaDrift && (
          <p role="alert" className="text-sm text-warning">
            This spreadsheet&apos;s headings changed since the mapping was last confirmed. Review
            the mapping again before importing.
          </p>
        )}
        {data && (
          <>
            <h2 className="font-semibold">1. Match columns</h2>
            <p className="text-sm text-muted-foreground">
              The first row contains headings. Name or first_name + last_name both work. Include
              only the fields you need; each contact needs an email, phone, or external ID. Unmapped
              columns are ignored. Profile fields are retained on the import record.
            </p>
            <TabularPreview
              headers={data.matrix.headers}
              rows={data.matrix.rows}
              caption={`Source sample · ${row.sheetTab} · first ${data.matrix.rows.length} data rows`}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((field) => {
                const key = field.key as keyof ColumnMapping
                return (
                  <label key={key} className="space-y-1 text-sm">
                    <span>{field.label}</span>
                    <select
                      disabled={busy}
                      value={mapping?.[key] ?? ''}
                      onChange={(event) => {
                        const next = { ...mapping }
                        if (event.target.value === '') delete next[key]
                        else next[key] = Number(event.target.value)
                        setEdit({ fingerprint: data.schemaFingerprint, mapping: next })
                        reset()
                      }}
                      className="h-9 w-full rounded-lg border bg-card px-2"
                    >
                      <option value="">Do not import</option>
                      {data.matrix.headers.map((header, index) => (
                        <option
                          key={index}
                          value={index}
                          disabled={Object.entries(mapping ?? {}).some(
                            ([other, value]) => other !== key && value === index,
                          )}
                        >
                          {index + 1}. {header}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
            <h2 className="pt-2 font-semibold">2. Confirm import</h2>
            <p className="text-sm">
              {data.eligible} eligible rows · {data.skipped} skipped
            </p>
            {preview.isFetching && (
              <p role="status" className="text-sm">
                Updating preview…
              </p>
            )}
            {data.matrix.truncated && (
              <p className="text-sm text-warning">
                Counts cover the first 5,000 rows. Import runs in batches of up to 2,000 source
                rows; continue until complete.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Existing contacts may be linked rather than created. Existing identity and consent are
              preserved. This is a manual pull from the sheet; changes in the CRM are not written
              back.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={!ready}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              <span>
                I have reviewed this source and column mapping and want to import these contacts.
              </span>
            </label>
            <Button
              disabled={!ready || !reviewed || (sync.isSuccess && !sync.data?.data?.hasMore)}
              onClick={async () => {
                if (!mapping) return
                setError(null)
                try {
                  if (!sync.data?.data?.hasMore) {
                    await confirmMapping.mutateAsync({
                      integrationId,
                      sourceId,
                      mapping,
                      schemaFingerprint: data.schemaFingerprint,
                    })
                  }
                  await sync.mutateAsync({ integrationId, sourceId })
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : 'Import failed. Please try again.',
                  )
                }
              }}
            >
              {busy
                ? 'Importing…'
                : sync.data?.data?.hasMore
                  ? 'Continue import'
                  : 'Confirm and import'}
            </Button>
            {sync.isSuccess && (
              <p role="status" className="text-sm">
                This batch: {sync.data?.data?.created} new contacts, {sync.data?.data?.matched}{' '}
                linked.{' '}
                {sync.data?.data?.hasMore
                  ? 'More rows remain. Continue import to finish.'
                  : 'Import complete.'}{' '}
                <Link className="underline" to="/contacts">
                  View contacts
                </Link>
              </p>
            )}
          </>
        )}
        {preview.isError && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEdit(null)
                setReviewed(false)
              }}
            >
              Reset column mapping
            </Button>
            <Button variant="outline" onClick={() => void preview.refetch()}>
              Retry preview
            </Button>
          </div>
        )}
      </section>
      {runs.data?.data.runs.length ? (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Recent imports</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {runs.data.data.runs.map((run) => (
              <li key={run.id}>
                {new Date(run.startedAt).toLocaleString()} · {run.status.toLowerCase()} ·{' '}
                {run.created} new · {run.matched} linked · {run.skipped} skipped
                {run.error ? ` · ${run.error}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {errors && (
        <p role="alert" className="text-sm text-destructive">
          {errors}
        </p>
      )}
    </div>
  )
}
