import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  useConfirmGoogleSheetsMapping,
  useExportContactsToGoogleSheets,
  useGoogleSheetsTabs,
  useIntegration,
  usePreviewGoogleSheetsImport,
  useSelectGoogleSheetsSpreadsheet,
  useSelectGoogleSheetsTab,
  useSyncIntegration,
  type components,
} from '@project/sdk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { GoogleSheetPicker } from '@/components/crm/GoogleSheetPicker'

type ColumnMapping = components['schemas']['GoogleColumnMapping']

const FIELDS: { key: keyof ColumnMapping; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
]

export function GoogleSheetsPage() {
  const { integrationId } = useParams<{ integrationId: string }>()
  const integration = useIntegration(integrationId)
  const selectSpreadsheet = useSelectGoogleSheetsSpreadsheet()
  const selectTab = useSelectGoogleSheetsTab()
  const preview = usePreviewGoogleSheetsImport()
  const confirmMapping = useConfirmGoogleSheetsMapping()
  const syncNow = useSyncIntegration()
  const exportContacts = useExportContactsToGoogleSheets()

  // null = "no explicit edit yet, fall back to the server's suggested mapping" (see
  // effectiveMapping below) rather than mirroring server state into local state via an effect.
  const [mappingOverride, setMappingOverride] = useState<ColumnMapping | null>(null)
  const [exportResult, setExportResult] = useState<{ url: string; contactCount: number } | null>(
    null,
  )

  const row = integration.data?.data
  const tabsQuery = useGoogleSheetsTabs(integrationId && row?.spreadsheetId ? integrationId : null)
  const mapping = mappingOverride ?? preview.data?.data?.suggestedMapping ?? null

  // Re-run the preview whenever the confirmed tab changes so the page opens on real numbers
  // instead of a stale mapping from a previous tab.
  useEffect(() => {
    if (integrationId && row?.spreadsheetId && row?.sheetTab) {
      preview.mutate({ integrationId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId, row?.spreadsheetId, row?.sheetTab])

  if (!integrationId) return null

  if (integration.isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (!row || row.provider !== 'GOOGLE_SHEETS') {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Google Sheets integration not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <BackLink />
      <PageHeader
        variant="detail"
        title="Google Sheets"
        description="Import contacts from a spreadsheet, or export your CRM to a new one."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Choose a spreadsheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {row.spreadsheetName ? (
            <p>
              Connected to <span className="font-medium">{row.spreadsheetName}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">No spreadsheet chosen yet.</p>
          )}
          <GoogleSheetPicker
            integrationId={integrationId}
            onPicked={(file) => {
              setMappingOverride(null)
              selectSpreadsheet.mutate({
                integrationId,
                spreadsheetId: file.id,
                spreadsheetName: file.name,
              })
            }}
          />
        </CardContent>
      </Card>

      {row.spreadsheetId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Choose a tab</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {tabsQuery.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <select
                value={row.sheetTab ?? ''}
                onChange={(e) => {
                  setMappingOverride(null)
                  selectTab.mutate({ integrationId, sheetTab: e.target.value })
                }}
                className="flex h-10 w-full rounded-lg border border-input-border bg-transparent px-3 text-sm"
              >
                <option value="" disabled>
                  Select a tab…
                </option>
                {(tabsQuery.data?.data ?? []).map((tab) => (
                  <option key={tab.sheetId} value={tab.title}>
                    {tab.title}
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>
      ) : null}

      {row.sheetTab ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Map columns and import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {preview.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : preview.data?.data ? (
              <>
                <p className="text-base font-medium text-foreground">
                  {preview.data.data.totalRows} contacts found
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>{preview.data.data.withEmail} have an email</li>
                  <li>{preview.data.data.withPhone} have a phone number</li>
                  {preview.data.data.toSkip > 0 ? (
                    <li>{preview.data.data.toSkip} rows will be skipped</li>
                  ) : null}
                </ul>
                {preview.data.data.truncated ? (
                  <p className="text-warning">
                    This sheet is large — only the first rows were used to build this preview.
                  </p>
                ) : null}

                <div className="space-y-2 rounded-lg border border-border p-3">
                  {FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-muted-foreground">{field.label}</span>
                      <select
                        value={mapping?.[field.key] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : Number(e.target.value)
                          const next = { ...mapping, [field.key]: value }
                          setMappingOverride(next)
                          preview.mutate({ integrationId, mapping: next })
                        }}
                        className="flex h-9 w-full rounded-lg border border-input-border bg-transparent px-2 text-sm"
                      >
                        <option value="">— not mapped —</option>
                        {preview.data!.data.headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  disabled={
                    !mapping ||
                    (mapping.email === undefined && mapping.phone === undefined) ||
                    confirmMapping.isPending ||
                    syncNow.isPending
                  }
                  onClick={async () => {
                    if (!mapping) return
                    await confirmMapping.mutateAsync({ integrationId, mapping })
                    await syncNow.mutateAsync(integrationId)
                  }}
                >
                  {syncNow.isPending
                    ? 'Importing…'
                    : `Import ${preview.data.data.toImport} contacts`}
                </Button>
                {syncNow.isSuccess ? (
                  <p className="text-success">
                    Imported {syncNow.data?.data?.created} new contacts (
                    {syncNow.data?.data?.linked} already existed).
                  </p>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export contacts to Google Sheets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Creates a brand-new spreadsheet with every contact in your CRM.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={exportContacts.isPending}
            onClick={async () => {
              const result = await exportContacts.mutateAsync({ integrationId })
              setExportResult(result.data)
            }}
          >
            {exportContacts.isPending ? 'Creating spreadsheet…' : 'Export to a new sheet'}
          </Button>
          {exportResult ? (
            <p>
              Created a sheet with {exportResult.contactCount} contacts —{' '}
              <a
                href={exportResult.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline"
              >
                open it in Google Sheets
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/integrations"
      className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft size={16} className="mr-1.5" /> Back to Integrations
    </Link>
  )
}
