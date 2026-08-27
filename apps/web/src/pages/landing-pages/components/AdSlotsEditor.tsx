import { useAdUnits, useCreatives } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useFlatPages } from '@/hooks/useFlatPages'

const PLACEMENTS = [
  { id: 'AFTER_HERO', label: 'After hero' },
  { id: 'BEFORE_FORM', label: 'Before form' },
  { id: 'AFTER_FORM', label: 'After form' },
  { id: 'BOTTOM', label: 'Bottom of page' },
] as const

export type AdSlotDraft = {
  placement: (typeof PLACEMENTS)[number]['id']
  adUnitId: string | null
}

export function AdSlotsEditor({
  slots,
  onChange,
}: {
  slots: AdSlotDraft[]
  onChange: (next: AdSlotDraft[]) => void
}) {
  const unitsQuery = useAdUnits({ limit: 100 })
  const creativesQuery = useCreatives({ limit: 100 })
  const units = useFlatPages(unitsQuery)
  const creatives = useFlatPages(creativesQuery)
  const creativeName = new Map(creatives.map((row) => [row.id, row.name]))

  function setSlot(index: number, patch: Partial<AdSlotDraft>) {
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Each space holds one ad. Empty spaces stay off the live page until you assign one.
      </p>
      {slots.map((slot, index) => (
        <Card key={`${slot.placement}-${index}`}>
          <CardContent className="py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Ad space {index + 1}</p>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-4"
                onClick={() => onChange(slots.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Placement
              <select
                value={slot.placement}
                onChange={(e) =>
                  setSlot(index, { placement: e.target.value as AdSlotDraft['placement'] })
                }
                className="flex h-9 rounded-lg border border-input-border bg-transparent px-2 text-sm text-foreground"
              >
                {PLACEMENTS.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Ad
              <select
                value={slot.adUnitId ?? ''}
                onChange={(e) => setSlot(index, { adUnitId: e.target.value || null })}
                className="flex h-9 rounded-lg border border-input-border bg-transparent px-2 text-sm text-foreground"
              >
                <option value="">Empty space</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {creativeName.get(unit.creativeId) ?? unit.creativeId} · {unit.status}
                  </option>
                ))}
              </select>
            </label>
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={slots.length >= 24}
        onClick={() => onChange([...slots, { placement: 'AFTER_HERO', adUnitId: null }])}
      >
        Add ad space
      </Button>
    </div>
  )
}
