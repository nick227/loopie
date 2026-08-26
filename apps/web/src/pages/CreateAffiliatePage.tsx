import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAffiliateClasses, useAffiliateDeals, useAffiliates, useCreateAffiliate } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'

export function CreateAffiliatePage() {
  const navigate = useNavigate()
  const create = useCreateAffiliate()
  const classes = useAffiliateClasses({ limit: 100 })
  const deals = useAffiliateDeals({ limit: 100 })
  const affiliates = useAffiliates({ limit: 100 })
  const classItems = classes.data?.pages.flatMap((p) => p.data) ?? []
  const dealItems = deals.data?.pages.flatMap((p) => p.data) ?? []
  const people = affiliates.data?.pages.flatMap((p) => p.data) ?? []
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [classId, setClassId] = useState('')
  const [dealId, setDealId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [createLogin, setCreateLogin] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const result = await create.mutateAsync({
      name,
      classId,
      email: email || undefined,
      dealId: dealId || undefined,
      managerId: managerId || undefined,
      createLogin,
    }).catch((err: { message?: string }) => {
      setError(err.message ?? 'Could not create affiliate')
      return null
    })
    if (!result?.data) return
    navigate(`/affiliates/${result.data.id}`, { state: { initialPassword: result.data.initialPassword } })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">New affiliate</h1>
      <AffiliateNav />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Name
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Class
        <select className="h-9 rounded border border-input-border bg-transparent px-3 text-sm" value={classId} onChange={(e) => setClassId(e.target.value)} required>
          <option value="">Select class</option>
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
          {people.map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
        Create login
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={create.isPending}>Create</Button>
    </form>
  )
}
