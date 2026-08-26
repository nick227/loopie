import { useState, type FormEvent } from 'react'
import { ApiError } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { dollarsToMinor, formatUsd, newIdempotencyKey } from '@/lib/money'

type Props = {
  label: string
  submitLabel: string
  confirmLabel: string
  confirmCopy: (formattedAmount: string) => string
  variant?: 'default' | 'outline'
  defaultValue?: string
  pending: boolean
  onSubmit: (amountMinor: number, idempotencyKey: string) => Promise<void>
}

export function AmountForm({
  label,
  submitLabel,
  confirmLabel,
  confirmCopy,
  variant = 'default',
  defaultValue,
  pending,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState(defaultValue ?? '')
  const [confirmText, setConfirmText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const amountMinor = dollarsToMinor(Number(amount))
      if (!confirmText) {
        setConfirmText(confirmCopy(formatUsd(amountMinor)))
        return
      }
      await onSubmit(amountMinor, newIdempotencyKey(submitLabel))
      setAmount('')
      setConfirmText(null)
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
          onChange={(e) => {
            setAmount(e.target.value)
            setConfirmText(null)
          }}
          placeholder="0.00"
          required
        />
      </div>
      {confirmText ? (
        <p className="text-sm" role="status">
          {confirmText}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant={variant} disabled={pending}>
          {confirmText ? confirmLabel : submitLabel}
        </Button>
        {confirmText ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmText(null)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
