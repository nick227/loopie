import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useCreateImportSource,
  useImportSourceTabs,
  useImportSources,
  useIntegration,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { GoogleSheetPicker } from '@/components/crm/GoogleSheetPicker'

export function GoogleSheetsPage() {
  const { integrationId } = useParams<{ integrationId: string }>()
  const integration = useIntegration(integrationId)
  if (integration.isLoading) return <Skeleton className="h-64 w-full" />
  if (integration.error) return <p role="alert">{integration.error.message}</p>
  const row = integration.data?.data
  if (!row || row.provider !== 'GOOGLE_SHEETS') return <p>Google Sheets integration not found.</p>
  return <GoogleSheetsSources key={row.id} integrationId={row.id} row={row} />
}

function GoogleSheetsSources({
  integrationId,
  row,
}: {
  integrationId: string
  row: { status: string; externalAccountId?: string | null }
}) {
  const navigate = useNavigate()
  const sources = useImportSources(row.status === 'CONNECTED' ? integrationId : null)
  const createSource = useCreateImportSource()
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null)
  const [sheetTab, setSheetTab] = useState('')
  const tabs = useImportSourceTabs(integrationId, picked?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/integrations/google-sheets" className="text-sm underline">
        Google accounts
      </Link>
      <PageHeader
        variant="detail"
        title="Google Sheets sources"
        description={`${row.externalAccountId ?? 'Google Sheets'} · Saved spreadsheets you import contacts from.`}
      />
      {row.status !== 'CONNECTED' ? (
        <p>
          Reconnect this account from{' '}
          <Link to="/integrations/google-sheets" className="underline">
            Google accounts
          </Link>{' '}
          to continue.
        </p>
      ) : (
        <>
          {sources.isLoading && <Skeleton className="h-32 w-full" />}
          {sources.data?.data.map((source) => (
            <Link
              key={source.id}
              to={`/integrations/${integrationId}/google-sheets/sources/${source.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 hover:bg-accent"
            >
              <div>
                <p className="font-medium">{source.label}</p>
                <p className="text-sm text-muted-foreground">
                  {source.spreadsheetName} / {source.sheetTab}
                  {source.lastRunAt
                    ? ` · Last imported ${new Date(source.lastRunAt).toLocaleString()}`
                    : ' · Never imported'}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                {source.running && (
                  <span className="rounded-full bg-accent px-2 py-1">Importing…</span>
                )}
                {source.needsReview && (
                  <span className="rounded-full bg-warning/20 px-2 py-1 text-warning">
                    Needs review
                  </span>
                )}
              </div>
            </Link>
          ))}
          {sources.isSuccess && sources.data.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No spreadsheets saved yet.</p>
          )}
          <section className="space-y-3 rounded-lg border p-4">
            <h2 className="font-semibold">Add a spreadsheet</h2>
            <GoogleSheetPicker
              integrationId={integrationId}
              disabled={createSource.isPending}
              onPicked={(file) => {
                setPicked(file)
                setSheetTab('')
                setError(null)
              }}
            />
            {picked && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{picked.name}</p>
                <label className="block space-y-1 text-sm">
                  <span>Worksheet tab</span>
                  <select
                    disabled={tabs.isFetching || createSource.isPending}
                    value={sheetTab}
                    onChange={(event) => setSheetTab(event.target.value)}
                    className="h-10 w-full rounded-lg border bg-card px-3"
                  >
                    <option value="" disabled>
                      Select a tab…
                    </option>
                    {tabs.data?.data.map((tab) => (
                      <option key={tab.sheetId} value={tab.title}>
                        {tab.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!sheetTab || createSource.isPending}
                  onClick={async () => {
                    setError(null)
                    try {
                      const result = await createSource.mutateAsync({
                        integrationId,
                        spreadsheetId: picked.id,
                        sheetTab,
                      })
                      navigate(
                        `/integrations/${integrationId}/google-sheets/sources/${result.data!.id}`,
                      )
                    } catch (cause) {
                      setError(
                        cause instanceof Error ? cause.message : 'Could not save this source.',
                      )
                    }
                  }}
                >
                  {createSource.isPending ? 'Saving…' : 'Save source'}
                </Button>
              </div>
            )}
          </section>
        </>
      )}
      {(error || sources.error || tabs.error || createSource.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? (sources.error || tabs.error || createSource.error)?.message}
        </p>
      )}
    </div>
  )
}
