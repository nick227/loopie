import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useIntegration,
  useImportSourceTabs,
  useScheduleSyncTarget,
  useCreateScheduleSyncTarget,
  useDeleteScheduleSyncTarget,
  useSyncScheduleNow,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { GoogleSheetPicker } from '@/components/crm/GoogleSheetPicker'

// Schedule -> Google Sheets Sync (2026-09-10) — one-way LOOPIE -> Sheets mirror of Calendar
// tasks. Deliberately its own page, not a tab on GoogleSheetsPage.tsx: that page is the opposite
// direction (Sheets -> LOOPIE contact import) and shows a list of sources; this is exactly one
// connection per account, always either connected or not.
export function GoogleSheetsScheduleSyncPage() {
  const { integrationId } = useParams<{ integrationId: string }>()
  const integration = useIntegration(integrationId)
  if (integration.isLoading) return <Skeleton className="h-64 w-full" />
  if (integration.error) return <p role="alert">{integration.error.message}</p>
  const row = integration.data?.data
  if (!row || row.provider !== 'GOOGLE_SHEETS') return <p>Google Sheets integration not found.</p>
  return <ScheduleSync key={row.id} integrationId={row.id} row={row} />
}

function ScheduleSync({
  integrationId,
  row,
}: {
  integrationId: string
  row: { status: string; externalAccountId?: string | null }
}) {
  const target = useScheduleSyncTarget(row.status === 'CONNECTED' ? integrationId : null)
  const create = useCreateScheduleSyncTarget()
  const del = useDeleteScheduleSyncTarget()
  const syncNow = useSyncScheduleNow()
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null)
  const [sheetTab, setSheetTab] = useState('')
  const tabs = useImportSourceTabs(integrationId, picked?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  const connected = target.data?.data ?? null

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/integrations/google-sheets" className="text-sm underline">
        Google accounts
      </Link>
      <PageHeader
        variant="detail"
        title="Schedule sync"
        description={`${row.externalAccountId ?? 'Google Sheets'} · A live, one-way mirror of your Calendar tasks in one sheet tab.`}
      />
      {row.status !== 'CONNECTED' ? (
        <p>
          Reconnect this account from{' '}
          <Link to="/integrations/google-sheets" className="underline">
            Google accounts
          </Link>{' '}
          to continue.
        </p>
      ) : target.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : connected ? (
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {connected.spreadsheetName} / {connected.sheetTab}
              </p>
              <p className="text-sm text-muted-foreground">
                {connected.syncing
                  ? 'Syncing…'
                  : connected.lastSyncAt
                    ? `Last synced ${new Date(connected.lastSyncAt).toLocaleString()}`
                    : 'Never synced yet'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={syncNow.isPending || connected.syncing}
                onClick={() => syncNow.mutate(integrationId)}
              >
                {syncNow.isPending ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button
                variant="outline"
                disabled={del.isPending}
                onClick={() => del.mutate(integrationId)}
              >
                Disconnect
              </Button>
            </div>
          </div>
          {connected.lastSyncError && (
            <p role="alert" className="text-sm text-destructive">
              {connected.lastSyncError}
            </p>
          )}
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Connect a sheet</h2>
          <p className="text-sm text-muted-foreground">
            Every scheduled task is written as one row, matched by a Loopie ID column so later edits
            update that same row instead of adding a duplicate. This sheet is a mirror — editing it
            never changes anything in Loopie.
          </p>
          <GoogleSheetPicker
            integrationId={integrationId}
            disabled={create.isPending}
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
                  disabled={tabs.isFetching || create.isPending}
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
                disabled={!sheetTab || create.isPending}
                onClick={async () => {
                  setError(null)
                  try {
                    await create.mutateAsync({ integrationId, spreadsheetId: picked.id, sheetTab })
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : 'Could not connect this sheet.',
                    )
                  }
                }}
              >
                {create.isPending ? 'Connecting…' : 'Connect'}
              </Button>
            </div>
          )}
        </section>
      )}
      {(error || target.error || tabs.error || create.error || del.error || syncNow.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ??
            (target.error || tabs.error || create.error || del.error || syncNow.error)?.message}
        </p>
      )}
    </div>
  )
}
