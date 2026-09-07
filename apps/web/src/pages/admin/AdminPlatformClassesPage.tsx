import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAdminListPlatformClasses,
  useAdminListPlatformDeals,
  useAdminCreatePlatformClass,
  useAdminCreatePlatformDeal,
  useAdminUpdatePlatformClass,
  useAdminSetDefaultPlatformClass,
} from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { apiErrorMessage } from '@/lib/apiError'

interface PlatformAffiliateDeal {
  id: string
  name: string
  affiliateRateBps?: number | null
  managerShareBps?: number | null
}

interface PlatformAffiliateClass {
  id: string
  name: string
  isDefault: boolean
  defaultDeal?: { id: string; name: string } | null
}

export function AdminPlatformClassesPage() {
  const queryClient = useQueryClient()
  const { data: classesData, isLoading: classesLoading } = useAdminListPlatformClasses()
  const { data: dealsData, isLoading: dealsLoading } = useAdminListPlatformDeals()
  const [newClassName, setNewClassName] = useState('')
  const [newClassDealId, setNewClassDealId] = useState('')
  const [newDeal, setNewDeal] = useState({ name: '', affiliateRateBps: '', managerShareBps: '' })

  const createClass = useAdminCreatePlatformClass({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platformClasses'] })
      setNewClassName('')
      setNewClassDealId('')
      toast.success('Class created')
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Could not create this class')),
  })
  const updateClass = useAdminUpdatePlatformClass({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'platformClasses'] }),
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Could not update this class')),
  })
  const setDefaultClass = useAdminSetDefaultPlatformClass({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'platformClasses'] }),
    onError: (err: unknown) =>
      toast.error(apiErrorMessage(err, 'Could not set this as the default class')),
  })
  const createDeal = useAdminCreatePlatformDeal({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platformDeals'] })
      setNewDeal({ name: '', affiliateRateBps: '', managerShareBps: '' })
      toast.success('Deal created')
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Could not create this deal')),
  })

  if (classesLoading || dealsLoading) return <Skeleton className="h-[400px] w-full" />

  const classes = (classesData as { data?: PlatformAffiliateClass[] } | undefined)?.data ?? []
  const deals = (dealsData as { data?: PlatformAffiliateDeal[] } | undefined)?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Classes & Deals"
        description="Commission tiers for the platform-wide referral program. The default class is what a brand-new user starts in."
      />

      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          {classes.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No classes configured yet.
            </div>
          )}
          {classes.map((cls) => (
            <UniversalRow
              key={cls.id}
              title={cls.name}
              subtitle={cls.defaultDeal ? `Deal: ${cls.defaultDeal.name}` : 'No deal attached yet'}
              meta={
                cls.isDefault ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Default for new users
                  </span>
                ) : null
              }
              trailing={
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={cls.defaultDeal?.id ?? ''}
                    onChange={(e) =>
                      updateClass.mutate({ id: cls.id, defaultDealId: e.target.value || null })
                    }
                  >
                    <option value="">No deal</option>
                    {deals.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                  {!cls.isDefault ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDefaultClass.mutate({ id: cls.id })}
                      disabled={setDefaultClass.isPending}
                    >
                      Make default
                    </Button>
                  ) : null}
                </div>
              }
            />
          ))}
          <div className="flex flex-wrap items-center gap-2 border-t p-4">
            <Input
              placeholder="New class name"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            />
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={newClassDealId}
              onChange={(e) => setNewClassDealId(e.target.value)}
            >
              <option value="">No deal yet</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                createClass.mutate({
                  name: newClassName,
                  defaultDealId: newClassDealId || undefined,
                })
              }
              disabled={!newClassName.trim() || createClass.isPending}
            >
              Add class
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deals.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No deals configured yet.
            </div>
          )}
          {deals.map((deal) => (
            <UniversalRow
              key={deal.id}
              title={deal.name}
              subtitle={`Direct: ${((deal.affiliateRateBps ?? 0) / 100).toFixed(2)}% · Manager: ${((deal.managerShareBps ?? 0) / 100).toFixed(2)}%`}
            />
          ))}
          <div className="grid grid-cols-1 gap-2 border-t p-4 sm:grid-cols-4">
            <Input
              placeholder="Deal name"
              value={newDeal.name}
              onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
            />
            <Input
              placeholder="Direct rate % (e.g. 20)"
              value={newDeal.affiliateRateBps}
              onChange={(e) => setNewDeal({ ...newDeal, affiliateRateBps: e.target.value })}
            />
            <Input
              placeholder="Manager rate % (e.g. 5)"
              value={newDeal.managerShareBps}
              onChange={(e) => setNewDeal({ ...newDeal, managerShareBps: e.target.value })}
            />
            <Button
              onClick={() =>
                createDeal.mutate({
                  name: newDeal.name,
                  affiliateRateBps: Math.round(Number(newDeal.affiliateRateBps || 0) * 100),
                  managerShareBps: Math.round(Number(newDeal.managerShareBps || 0) * 100),
                })
              }
              disabled={!newDeal.name.trim() || createDeal.isPending}
            >
              Add deal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
