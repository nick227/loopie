import { Link, useSearchParams } from 'react-router-dom'
import { useCrmCatalog, useIntegrations, useStartCrmOAuth } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { useFlatPages } from '@/hooks/useFlatPages'

export function GoogleSheetsAccountsPage() {
  const [params] = useSearchParams()
  const integrations = useIntegrations()
  const catalog = useCrmCatalog()
  const oauth = useStartCrmOAuth()
  const accounts = useFlatPages(integrations).filter(
    (row) => row.provider === 'GOOGLE_SHEETS' && row.status !== 'INCOMPLETE',
  )
  const configured = catalog.data?.data.some(
    (row) => row.provider === 'GOOGLE_SHEETS' && row.configured,
  )
  return (
    <div className="max-w-3xl space-y-5">
      {params.get('connection') === 'cancelled' && (
        <p role="status" className="text-sm">
          Google connection was not completed. Choose an existing account or try connecting again.
        </p>
      )}
      <PageHeader
        variant="detail"
        title="Import from Google Sheets"
        description="Choose an account, select a spreadsheet, and review its columns before importing contacts."
      />
      <p className="text-sm text-muted-foreground">
        Imported contacts are available to CRM audiences, advertising, and messaging. Importing does
        not send messages or change existing consent.
      </p>
      {integrations.isLoading ? (
        <p role="status">Loading Google accounts…</p>
      ) : (
        accounts.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">
                {row.externalAccountId ?? row.label ?? 'Google account'}
              </p>
              <p className="text-sm text-muted-foreground">
                {row.importSourceCount
                  ? `${row.importSourceCount} saved source${row.importSourceCount === 1 ? '' : 's'}`
                  : 'No spreadsheets saved yet'}{' '}
                · {row.status.toLowerCase().replaceAll('_', ' ')}
              </p>
            </div>
            {row.status === 'CONNECTED' ? (
              <div className="flex gap-2">
                <Link to={`/integrations/${row.id}/google-sheets`}>
                  <Button variant="outline">Manage sources</Button>
                </Link>
                <Link to={`/integrations/${row.id}/schedule-sync`}>
                  <Button variant="outline">Schedule sync</Button>
                </Link>
              </div>
            ) : (
              <span className="text-sm">Connect this account again below to restore access.</span>
            )}
          </div>
        ))
      )}
      {integrations.hasNextPage && (
        <Button
          variant="outline"
          disabled={integrations.isFetchingNextPage}
          onClick={() => void integrations.fetchNextPage()}
        >
          Load more accounts
        </Button>
      )}
      <div className="space-y-2 rounded-lg border p-4">
        <Button
          disabled={!configured || oauth.isPending}
          onClick={() =>
            oauth.mutate(
              { provider: 'GOOGLE_SHEETS', returnPath: '/integrations/google-sheets' },
              {
                onSuccess: (result) => {
                  if (result.data) window.location.assign(result.data.url)
                },
              },
            )
          }
        >
          {oauth.isPending
            ? 'Connecting…'
            : accounts.length
              ? 'Connect another Google account'
              : 'Connect Google account'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already use Google to sign in? Grant spreadsheet access once, then reuse the connection
          here.
        </p>
        {catalog.isSuccess && !configured && (
          <p role="status" className="text-sm">
            Google Sheets connections are not available yet. You can import a CSV from Contacts.
          </p>
        )}
      </div>
      {(integrations.error || catalog.error || oauth.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(integrations.error || catalog.error || oauth.error)?.message}
        </p>
      )}
      <Link className="text-sm underline" to="/contacts">
        Back to contacts
      </Link>
    </div>
  )
}
