import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAdminListPlatformAffiliateAttributions,
  useAdminListPlatformAffiliates,
  useAdminListBusinesses,
  useAdminSetBusinessAttribution,
} from '@project/sdk'
import { ApiError } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { apiErrorMessage } from '@/lib/apiError'

const formatRate = (bps: number) => `${(bps / 100).toFixed(2)}%`

interface Attribution {
  businessId: string
  business: { id: string; name: string }
  affiliate: { id: string; name: string }
  managerAffiliate?: { id: string; name: string } | null
  affiliateRateBps: number
  managerShareBps?: number | null
  attributedAt: string
}

interface PlatformAffiliate {
  id: string
  name: string
}

interface Business {
  id: string
  name: string
}

/** Debounced text search over businesses, showing a result list to pick from — replaces a flat
 * <select> that only ever loaded the first page and couldn't find anything past it. */
function BusinessPicker({
  selected,
  onSelect,
}: {
  selected: Business | null
  onSelect: (business: Business | null) => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(handle)
  }, [query])

  const searchQuery = useAdminListBusinesses({ q: debounced || undefined, limit: 20 } as any, {
    enabled: debounced.length > 0,
  })
  const results =
    (searchQuery.data?.pages as { data: Business[] }[] | undefined)?.flatMap((p) => p.data) ?? []

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
        <span className="flex-1 truncate">{selected.name}</span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            onSelect(null)
            setQuery('')
          }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        placeholder="Search businesses by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {debounced.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
          {searchQuery.isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No matches</div>
          ) : (
            results.map((b) => (
              <button
                key={b.id}
                type="button"
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onSelect(b)
                  setQuery('')
                }}
              >
                {b.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function AdminPlatformReferralsPage() {
  const queryClient = useQueryClient()
  const { data: attributionsData, isLoading } = useAdminListPlatformAffiliateAttributions()
  const { data: affiliatesData } = useAdminListPlatformAffiliates()

  const [business, setBusiness] = useState<Business | null>(null)
  const [affiliateId, setAffiliateId] = useState('')

  const setAttribution = useAdminSetBusinessAttribution({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platformAffiliateAttributions'] })
      setBusiness(null)
      setAffiliateId('')
      toast.success('Referral attribution saved')
    },
    onError: (err: unknown) => {
      // Post-payment lock — offer the deliberate, explicit override rather than just failing.
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        /already been billed/i.test(err.message)
      ) {
        if (
          business &&
          affiliateId &&
          window.confirm(`${err.message}\n\nForce this reassignment anyway?`)
        ) {
          setAttribution.mutate({ businessId: business.id, affiliateId, force: true })
        }
        return
      }
      toast.error(apiErrorMessage(err, 'Could not save this referral attribution'))
    },
  })

  if (isLoading) return <Skeleton className="h-[400px] w-full" />

  const attributions = (attributionsData as { data?: Attribution[] } | undefined)?.data ?? []
  const affiliates = (affiliatesData as { data?: PlatformAffiliate[] } | undefined)?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Referrals"
        description="Which business is attributed to which platform affiliate, and at what rate."
      />

      <Card>
        <CardHeader>
          <CardTitle>Set or reassign a referral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <BusinessPicker selected={business} onSelect={setBusiness} />
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={affiliateId}
              onChange={(e) => setAffiliateId(e.target.value)}
            >
              <option value="">Select affiliate…</option>
              {affiliates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                business && setAttribution.mutate({ businessId: business.id, affiliateId })
              }
              disabled={!business || !affiliateId || setAttribution.isPending}
            >
              Save
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Once a business has been billed, reassigning it will ask for confirmation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attributions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attributions.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No businesses are attributed to an affiliate yet.
            </div>
          )}
          {attributions.map((attr) => (
            <UniversalRow
              key={attr.businessId}
              title={attr.business.name}
              subtitle={`Referred by ${attr.affiliate.name} · ${formatRate(attr.affiliateRateBps)}${
                attr.managerAffiliate
                  ? ` · Manager override to ${attr.managerAffiliate.name} at ${formatRate(attr.managerShareBps ?? 0)}`
                  : ''
              }`}
              trailing={
                <span className="text-xs text-muted-foreground">
                  {new Date(attr.attributedAt).toLocaleDateString()}
                </span>
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
