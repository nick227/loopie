import { useState, type FormEvent } from 'react'
import { ApiError } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { dollarsToMinor, newIdempotencyKey } from '@/lib/money'

type Props = {
  label: string
  submitLabel: string
  defaultValue?: string
  pending: boolean
  onSubmit: (amountMinor: number, idempotencyKey: string) => Promise<void>
}

export function AmountForm({ label, submitLabel, defaultValue, pending, onSubmit }: Props) {
  const [amount, setAmount] = useState(defaultValue ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await onSubmit(dollarsToMinor(Number(amount)), newIdempotencyKey(submitLabel))
      setAmount('')
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`amount-${label}`} className="text-sm font-medium">
          {label}
        </label>
        <Input
          id={`amount-${label}`}
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  )
}
