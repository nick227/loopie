import { useState, useMemo, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  useAffiliateClasses,
  useAffiliateDeals,
  useAffiliates,
  useUpdateAffiliate,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DestinationPicker, SELECT_CLASS } from '@/components/affiliates/DestinationPicker'
import { SplitPreview } from '@/components/affiliates/SplitPreview'
import { useFlatPages } from '@/hooks/useFlatPages'

type AffiliateAssignment = {
  id: string
  classId: string
  dealId?: string | null
  managerId?: string | null
  affiliateRateOverrideBps?: number | null
  managerShareOverrideBps?: number | null
  destinationLandingPageId?: string | null
  commissionRateBps?: number | null
  managerShareBps?: number
}

function bpsToPercent(bps: number | null | undefined) {
  return bps == null ? '' : String(bps / 100)
}

function percentToBps(value: string) {
  if (value === '') return null
  return Math.round(Number(value) * 100)
}

export function AffiliateAssignmentForm({ affiliate }: { affiliate: AffiliateAssignment }) {
  const update = useUpdateAffiliate()
  const classes = useAffiliateClasses({ limit: 100 })
  const deals = useAffiliateDeals({ limit: 100 })
  const people = useAffiliates({ limit: 100 })
  const classItems = useFlatPages(classes)
  const dealItems = useFlatPages(deals)
  const allPeople = useFlatPages(people)

  const { others, downline } = useMemo(() => {
    const o = []
    const d = []
    for (const p of allPeople) {
      if (p.id !== affiliate.id) o.push(p)
      if (p.managerId === affiliate.id) d.push(p)
    }
    return { others: o, downline: d }
  }, [allPeople, affiliate.id])
  const [classId, setClassId] = useState(affiliate.classId ?? '')
  const [dealId, setDealId] = useState(affiliate.dealId ?? '')
  const [managerId, setManagerId] = useState(affiliate.managerId ?? '')
  const [landingPageId, setLandingPageId] = useState(affiliate.destinationLandingPageId ?? '')
  const [rateOverride, setRateOverride] = useState(bpsToPercent(affiliate.affiliateRateOverrideBps))
  const [shareOverride, setShareOverride] = useState(
    bpsToPercent(affiliate.managerShareOverrideBps),
  )
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    await update
      .mutateAsync({
        affiliateId: affiliate.id,
        classId,
        dealId: dealId || null,
        managerId: managerId || null,
        destinationLandingPageId: landingPageId || null,
        affiliateRateOverrideBps: percentToBps(rateOverride),
        managerShareOverrideBps: percentToBps(shareOverride),
      })
      .catch((err: { message?: string }) => {
        setError(err.message ?? 'Could not save assignment')
      })
  }

  const liveRate = percentToBps(rateOverride) ?? affiliate.commissionRateBps
  const liveShare = percentToBps(shareOverride) ?? affiliate.managerShareBps

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Class
        <select
          className={SELECT_CLASS}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          required
        >
          {classItems.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Deal
        <select className={SELECT_CLASS} value={dealId} onChange={(e) => setDealId(e.target.value)}>
          <option value="">Class default</option>
          {dealItems.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Manager
        <select
          className={SELECT_CLASS}
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
        >
          <option value="">None</option>
          {others.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <DestinationPicker value={landingPageId} onChange={setLandingPageId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Rate override %
        <Input value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Manager share override %
        <Input value={shareOverride} onChange={(e) => setShareOverride(e.target.value)} />
      </label>
      <SplitPreview rateBps={liveRate} managerShareBps={liveShare} hasManager={!!managerId} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>
        Save assignment
      </Button>
      {downline.length > 0 && (
        <div className="space-y-1 pt-2">
          <p className="text-sm font-medium">Downline</p>
          {downline.map((row) => (
            <Link
              key={row.id}
              to={`/affiliates/${row.id}`}
              className="block text-sm text-muted-foreground"
            >
              {row.name}
            </Link>
          ))}
        </div>
      )}
    </form>
  )
}
