import { useState } from 'react'
import { useAffiliateClasses, useAffiliateDeals, useCreateAffiliateClass, useCreateAffiliateDeal, useUpdateAffiliateClass } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { formatBps } from '@/lib/money'

export function AffiliateClassesPage() {
  const classesQuery = useAffiliateClasses({ limit: 100 })
  const dealsQuery = useAffiliateDeals({ limit: 100 })
  const createClass = useCreateAffiliateClass()
  const createDeal = useCreateAffiliateDeal()
  const updateClass = useUpdateAffiliateClass()
  const classes = classesQuery.data?.pages.flatMap((p) => p.data) ?? []
  const deals = dealsQuery.data?.pages.flatMap((p) => p.data) ?? []
  const [className, setClassName] = useState('Field Rep')
  const [dealName, setDealName] = useState('Standard 10')
  const [rate, setRate] = useState('10')
  const [share, setShare] = useState('0')
  const [classId, setClassId] = useState('')

  if (classesQuery.isLoading || dealsQuery.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Classes & Deals</h1>
      <AffiliateNav />
      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-sm font-medium">New class</p>
          <Input value={className} onChange={(e) => setClassName(e.target.value)} />
          <Button
            size="sm"
            onClick={() => createClass.mutate({ name: className, maxAffiliateRateBps: 5000, maxManagerShareBps: 5000 })}
          >
            Add class
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-sm font-medium">New deal</p>
          <Input value={dealName} onChange={(e) => setDealName(e.target.value)} />
          <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Affiliate % of sale" />
          <Input value={share} onChange={(e) => setShare(e.target.value)} placeholder="Manager % of gross" />
          <select className="h-9 w-full rounded border border-input-border bg-transparent px-3 text-sm" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Class</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() =>
              createDeal.mutateAsync({
                name: dealName,
                classId: classId || undefined,
                affiliateRateBps: Math.round(Number(rate) * 100),
                managerShareBps: Math.round(Number(share) * 100),
              }).then((res) => {
                if (classId && res?.data?.id) updateClass.mutate({ classId, defaultDealId: res.data.id })
              })
            }
          >
            Add deal
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {classes.map((row) => (
          <p key={row.id} className="text-sm">{row.name} · cap {formatBps(row.maxAffiliateRateBps)}</p>
        ))}
        {deals.map((row) => (
          <p key={row.id} className="text-sm text-muted-foreground">
            {row.name} · {formatBps(row.affiliateRateBps)} / {formatBps(row.managerShareBps)} · {row.payoutCadence}
          </p>
        ))}
      </div>
    </div>
  )
}
