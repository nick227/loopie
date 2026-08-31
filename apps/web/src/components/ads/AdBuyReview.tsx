import { useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { usePlatformConnection } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  AD_AUCTION_NOTE,
  AD_DRAFT_NOTE,
  AD_FINANCE_NOTE,
  AD_NEEDS_ATTENTION_TITLE,
  AD_READY_TITLE,
  AD_STOP_NOTE,
} from '@/lib/adCopy'
import {
  dateInput,
  estimatedMaximum,
  localTimezoneLabel,
  money,
  type AdOrder,
  type AdOrderSnapshot,
} from '@/lib/adOrder'
import type { PaidTarget } from '@/lib/adPreview'
import { cn } from '@/lib/utils'

type Check = { label: string; ok: boolean }

function PreflightRow({ check }: { check: Check }) {
  const Icon = check.ok ? CircleCheck : CircleAlert
  return (
    <li
      className={cn('flex items-center gap-2', check.ok ? 'text-foreground' : 'text-destructive')}
    >
      <Icon size={15} className="shrink-0" />
      <span>{check.label}</span>
    </li>
  )
}

export function AdBuyReview({
  target,
  pending,
  error,
  initialOrder,
  onBack,
  onSend,
}: {
  target: PaidTarget
  pending: boolean
  error?: string | null
  initialOrder?: AdOrderSnapshot
  onBack: () => void
  onSend: (order: Partial<AdOrder>) => void
}) {
  const connection = usePlatformConnection(target.platform)
  const account = connection.data?.data
  const connected = account?.status === 'CONNECTED'
  const [dailyBudget, setDailyBudget] = useState(initialOrder?.dailyBudget ?? 25)
  const [startDate, setStartDate] = useState(initialOrder?.startDate || dateInput())
  const [endDate, setEndDate] = useState(initialOrder?.endDate ?? '')
  const estimate = estimatedMaximum(dailyBudget, startDate, endDate)
  const timezoneLabel = localTimezoneLabel()

  const budgetValid = Number.isFinite(dailyBudget) && dailyBudget > 0
  const startValid = !Number.isNaN(new Date(`${startDate}T00:00:00`).getTime())
  const scheduleValid =
    startValid && (!endDate || new Date(`${endDate}T00:00:00`) > new Date(`${startDate}T00:00:00`))

  const checks: Check[] = [
    {
      label: connected ? `${target.brand} connected` : `${target.brand} is not connected`,
      ok: connected,
    },
    { label: budgetValid ? 'Budget valid' : 'Budget must be a positive number', ok: budgetValid },
    {
      label: scheduleValid ? 'Schedule valid' : 'End date must be after the start date',
      ok: scheduleValid,
    },
  ]
  const ready = checks.every((check) => check.ok)

  return (
    <Modal
      title={`${target.brand} Settings`}
      onClose={onBack}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancel
          </Button>
          {!connected ? (
            <Button type="button" onClick={() => window.open('/platforms', '_blank')}>
              Connect {target.brand}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending || !ready}
              onClick={() =>
                onSend({
                  dailyBudget,
                  startDate,
                  endDate: endDate || undefined,
                })
              }
            >
              Confirm Settings
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        <div
          className={cn(
            'space-y-2 rounded-lg border p-3',
            ready ? 'border-border bg-accent' : 'border-destructive/40 bg-destructive/5',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider">
            {ready ? AD_READY_TITLE : AD_NEEDS_ATTENTION_TITLE}
          </p>
          <ul className="space-y-1.5 text-xs">
            {checks.map((check) => (
              <PreflightRow key={check.label} check={check} />
            ))}
          </ul>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Starts
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ends
            </span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Times are resolved in your local timezone ({timezoneLabel}).
        </p>

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Daily budget
          </span>
          <div className="flex items-center gap-1">
            <span>$</span>
            <Input
              type="number"
              min={1}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="h-10 w-24"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {endDate && estimate
              ? `Estimated maximum ${money(estimate)}`
              : 'Until manually stopped'}
          </p>
          <p className="text-xs text-muted-foreground">{AD_FINANCE_NOTE}</p>
        </label>
        <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>{AD_AUCTION_NOTE(target.brand)}</p>
          <p>{AD_DRAFT_NOTE}</p>
          <p>{AD_STOP_NOTE(target.brand)}</p>
        </div>
      </div>
    </Modal>
  )
}
