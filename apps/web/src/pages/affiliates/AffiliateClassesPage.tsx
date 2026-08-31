import { useState, useMemo } from 'react'
import {
  useAffiliateClasses,
  useAffiliateDeals,
  useCreateAffiliateClass,
  useCreateAffiliateDeal,
  useUpdateAffiliateClass,
  useUpdateAffiliateDeal,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { SELECT_CLASS } from '@/components/affiliates/DestinationPicker'
import { formatBps } from '@/lib/money'
import { useFlatPages } from '@/hooks/useFlatPages'

export function AffiliateClassesPage() {
  const classesQuery = useAffiliateClasses({ limit: 100 })
  const dealsQuery = useAffiliateDeals({ limit: 100 })
  const classes = useFlatPages(classesQuery)
  const deals = useFlatPages(dealsQuery)

  const { dealsByClass, unscopedDeals } = useMemo(() => {
    const map = new Map<string, typeof deals>()
    const unscoped: typeof deals = []
    for (const deal of deals) {
      if (!deal.classId) unscoped.push(deal)
      else {
        let list = map.get(deal.classId)
        if (!list) {
          list = []
          map.set(deal.classId, list)
        }
        list.push(deal)
      }
    }
    return { dealsByClass: map, unscopedDeals: unscoped }
  }, [deals])

  if (classesQuery.isLoading || dealsQuery.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader variant="list" title="Classes & Deals">
        <AffiliateNav />
        <p className="text-sm text-muted-foreground">
          Named packages. Setting a default is explicit — creating a deal does not change it.
        </p>
      </PageHeader>
      <NewClassForm />
      <NewDealForm classes={classes} />
      {classes.map((cls) => (
        <Card key={cls.id}>
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium">
              {cls.name} · cap {formatBps(cls.maxAffiliateRateBps)} /{' '}
              {formatBps(cls.maxManagerShareBps)} manager
            </p>
            {(dealsByClass.get(cls.id) || []).map((deal) => (
              <DealRow
                key={deal.id}
                deal={deal}
                isDefault={cls.defaultDealId === deal.id}
                classId={cls.id}
              />
            ))}
          </CardContent>
        </Card>
      ))}
      {unscopedDeals.length > 0 && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium">Unscoped deals</p>
            {unscopedDeals.map((deal) => (
              <DealRow key={deal.id} deal={deal} isDefault={false} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function NewClassForm() {
  const createClass = useCreateAffiliateClass()
  const [name, setName] = useState('Field Rep')
  const [cap, setCap] = useState('50')
  const [share, setShare] = useState('50')
  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <p className="text-sm font-medium">New class</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Max % of sale" />
        <Input
          value={share}
          onChange={(e) => setShare(e.target.value)}
          placeholder="Max manager % of commission"
        />
        <Button
          size="sm"
          onClick={() =>
            createClass.mutate({
              name,
              maxAffiliateRateBps: Math.round(Number(cap) * 100),
              maxManagerShareBps: Math.round(Number(share) * 100),
            })
          }
        >
          Add class
        </Button>
      </CardContent>
    </Card>
  )
}

function NewDealForm({ classes }: { classes: { id: string; name: string }[] }) {
  const createDeal = useCreateAffiliateDeal()
  const [name, setName] = useState('Standard 10')
  const [rate, setRate] = useState('10')
  const [share, setShare] = useState('0')
  const [classId, setClassId] = useState('')
  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <p className="text-sm font-medium">New deal</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="% of sale" />
        <Input
          value={share}
          onChange={(e) => setShare(e.target.value)}
          placeholder="Manager % of that commission"
        />
        <select
          className={SELECT_CLASS}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Class</option>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() =>
            createDeal.mutate({
              name,
              classId: classId || undefined,
              affiliateRateBps: Math.round(Number(rate) * 100),
              managerShareBps: Math.round(Number(share) * 100),
            })
          }
        >
          Add deal
        </Button>
      </CardContent>
    </Card>
  )
}

function DealRow({
  deal,
  isDefault,
  classId,
}: {
  deal: { id: string; name: string; affiliateRateBps?: number | null; managerShareBps: number }
  isDefault: boolean
  classId?: string
}) {
  const updateDeal = useUpdateAffiliateDeal()
  const updateClass = useUpdateAffiliateClass()
  const [rate, setRate] = useState(
    deal.affiliateRateBps != null ? String(deal.affiliateRateBps / 100) : '10',
  )
  const [share, setShare] = useState(String(deal.managerShareBps / 100))
  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm">
        {deal.name}
        {isDefault ? ' · default' : ''}
      </p>
      <div className="flex gap-2">
        <Input value={rate} onChange={(e) => setRate(e.target.value)} />
        <Input value={share} onChange={(e) => setShare(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            updateDeal.mutate({
              dealId: deal.id,
              affiliateRateBps: Math.round(Number(rate) * 100),
              managerShareBps: Math.round(Number(share) * 100),
            })
          }
        >
          Save
        </Button>
        {classId && !isDefault && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateClass.mutate({ classId, defaultDealId: deal.id })}
          >
            Make default
          </Button>
        )}
      </div>
    </div>
  )
}
