import { useState, type FormEvent } from 'react'
import { ApiError, useRecordAdSpend, useSettleAdSpend } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { dollarsToMinor, formatUsd, newIdempotencyKey } from '@/lib/money'

const PLATFORMS = ['META', 'GOOGLE', 'TIKTOK', 'LOOPIE'] as const

export function RecordSpendForm({ campaignId }: { campaignId: string }) {
  const recordSpend = useRecordAdSpend()
  const settleSpend = useSettleAdSpend()
  const [amount, setAmount] = useState('')
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('META')
  const [chargeId, setChargeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSpend, setLastSpend] = useState<{ id: string; amountMinor: number } | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const amountMinor = dollarsToMinor(Number(amount))
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    try {
      const result = await recordSpend.mutateAsync({
        campaignId,
        amountMinor,
        currency: 'USD',
        platform,
        externalChargeId: chargeId.trim() || `manual-${crypto.randomUUID()}`,
        periodStart: weekAgo.toISOString(),
        periodEnd: today.toISOString(),
        idempotencyKey: newIdempotencyKey('spend'),
      })
      const spend = result.data
      if (!spend) throw new Error('Ad spend was not returned')
      setLastSpend({ id: spend.id, amountMinor })
      setAmount('')
      setChargeId('')
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Request failed')
    }
  }

  async function handleSettle() {
    if (!lastSpend) return
    setError(null)
    try {
      await settleSpend.mutateAsync({
        adSpendId: lastSpend.id,
        settledAmountMinor: lastSpend.amountMinor,
        idempotencyKey: newIdempotencyKey('settle'),
      })
      setLastSpend(null)
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount-reported-spend" className="text-sm font-medium">
          Reported spend
        </label>
        <Input
          id="amount-reported-spend"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="125.37"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="spend-platform" className="text-sm font-medium">
          Platform
        </label>
        <select
          id="spend-platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
          className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PLATFORMS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="spend-charge-id" className="text-sm font-medium">
          External charge ID
        </label>
        <Input
          id="spend-charge-id"
          value={chargeId}
          onChange={(e) => setChargeId(e.target.value)}
          placeholder="Optional — Meta/Google charge id"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        size="sm"
        disabled={recordSpend.isPending}
        className="!shadow-none hover:!translate-y-0"
      >
        Record spend
      </Button>
      {lastSpend ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={settleSpend.isPending}
          onClick={handleSettle}
          className="!shadow-none hover:!translate-y-0"
        >
          Settle {formatUsd(lastSpend.amountMinor)}
        </Button>
      ) : null}
    </form>
  )
}
