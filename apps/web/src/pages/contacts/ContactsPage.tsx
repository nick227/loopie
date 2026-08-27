import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContacts, useResultsSummary } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { List, Plus, Upload } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { CrmNav } from '@/pages/crm/CrmNav'

export function ContactsPage() {
  const [q, setQ] = useState('')
  const query = useContacts(q ? { q } : undefined)
  const items = useFlatPages(query)
  const results = useResultsSummary()
  const bySource = (results.data?.data?.bySource ?? []).slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">People in your customer graph.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/contacts/import/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-input-border px-4 text-sm font-medium hover:bg-accent"
          >
            <Upload size={15} /> Import
          </Link>
          <Link
            to="/contacts/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={15} /> Add contact
          </Link>
        </div>
      </div>
      <CrmNav />

      {bySource.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">Attributed revenue</p>
            {bySource.map((row) => (
              <p
                key={`${row.sourceType}-${row.sourceId}`}
                className="text-sm text-muted-foreground"
              >
                {row.label}: ${row.revenue} · {row.sales} sales
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <label className="block max-w-md">
        <span className="sr-only">Search contacts</span>
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search contacts…"
          type="search"
        />
      </label>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          Contacts could not be loaded.{' '}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={List}
          title={q ? 'No matching contacts' : 'No contacts yet'}
          description={q ? 'Try a different search.' : 'Add or import a contact to get started.'}
        />
      ) : (
        <div className="space-y-3">
          {items.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{contact.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {contact.email ?? contact.phone ?? 'No contact details'}
                  </p>
                </div>
                <Link
                  to={`/contacts/${contact.id}`}
                  className="text-sm underline underline-offset-4"
                >
                  View
                </Link>
              </CardContent>
            </Card>
          ))}
          {query.hasNextPage && (
            <button
              type="button"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="w-full py-3 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
