import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAffiliateClasses, useAffiliateDeals, useAffiliates, useUpdateAffiliate } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type AffiliateAssignment = {
  id: string
  classId: string
  dealId?: string | null
  managerId?: string | null
  affiliateRateOverrideBps?: number | null
  managerShareOverrideBps?: number | null
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
  const classItems = classes.data?.pages.flatMap((p) => p.data) ?? []
  const dealItems = deals.data?.pages.flatMap((p) => p.data) ?? []
  const others = (people.data?.pages.flatMap((p) => p.data) ?? []).filter((row) => row.id !== affiliate.id)
  const downline = (people.data?.pages.flatMap((p) => p.data) ?? []).filter((row) => row.managerId === affiliate.id)
  const [classId, setClassId] = useState(affiliate.classId ?? '')
  const [dealId, setDealId] = useState(affiliate.dealId ?? '')
  const [managerId, setManagerId] = useState(affiliate.managerId ?? '')
  const [rateOverride, setRateOverride] = useState(bpsToPercent(affiliate.affiliateRateOverrideBps))
  const [shareOverride, setShareOverride] = useState(bpsToPercent(affiliate.managerShareOverrideBps))
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    await update.mutateAsync({
      affiliateId: affiliate.id,
      classId,
      dealId: dealId || null,
      managerId: managerId || null,
      affiliateRateOverrideBps: percentToBps(rateOverride),
      managerShareOverrideBps: percentToBps(shareOverride),
    }).catch((err: { message?: string }) => {
      setError(err.message ?? 'Could not save assignment')
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Class
        <select className="h-9 rounded border border-input-border bg-transparent px-3 text-sm" value={classId} onChange={(e) => setClassId(e.target.value)} required>
          {classItems.map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Deal
        <select className="h-9 rounded border border-input-border bg-transparent px-3 text-sm" value={dealId} onChange={(e) => setDealId(e.target.value)}>
          <option value="">Class default</option>
          {dealItems.map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Manager
        <select className="h-9 rounded border border-input-border bg-transparent px-3 text-sm" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">None</option>
          {others.map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Rate override %
        <Input value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Manager share override %
        <Input value={shareOverride} onChange={(e) => setShareOverride(e.target.value)} />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>Save assignment</Button>
      {downline.length > 0 && (
        <div className="space-y-1 pt-2">
          <p className="text-sm font-medium">Downline</p>
          {downline.map((row) => (
            <Link key={row.id} to={`/affiliates/${row.id}`} className="block text-sm text-muted-foreground">
              {row.name}
            </Link>
          ))}
        </div>
      )}
    </form>
  )
}
