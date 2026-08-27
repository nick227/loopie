import { Link } from 'react-router-dom'
import { Plus, RectangleHorizontal, X } from 'lucide-react'
import { AD_PLACEMENTS, type AdSlotDraft } from './adSlots'
import { useAdCatalog } from './useAdCatalog'

const selectClass =
  'h-8 max-w-full rounded border border-zinc-300 bg-white px-2 text-xs text-zinc-800'

export function CanvasAdBand({
  placement,
  slots,
  onChange,
}: {
  placement: AdSlotDraft['placement']
  slots: AdSlotDraft[]
  onChange: (next: AdSlotDraft[]) => void
}) {
  const catalog = useAdCatalog()
  const label = AD_PLACEMENTS.find((row) => row.id === placement)?.label ?? placement
  const indexes = slots.flatMap((slot, index) => (slot.placement === placement ? [index] : []))

  function patch(index: number, next: Partial<AdSlotDraft>) {
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...next } : slot)))
  }

  return (
    <div className="px-6 py-3">
      <div className="mx-auto max-w-[1040px] space-y-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          <RectangleHorizontal size={13} /> {label}
        </p>
        {indexes.map((index) => {
          const slot = slots[index]!
          return (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`${label} placement`}
                value={slot.placement}
                onChange={(e) =>
                  patch(index, { placement: e.target.value as AdSlotDraft['placement'] })
                }
                className={selectClass}
              >
                {AD_PLACEMENTS.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
              <select
                aria-label={`${label} ad`}
                disabled={catalog.loading || catalog.failed}
                value={slot.adUnitId ?? ''}
                onChange={(e) => patch(index, { adUnitId: e.target.value || null })}
                className={`${selectClass} min-w-[12rem] flex-1`}
              >
                <option value="">Empty space</option>
                {catalog.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {catalog.labelFor(unit)}
                  </option>
                ))}
              </select>
              {slot.adUnitId ? (
                <Link
                  to={`/ads/${catalog.units.find((u) => u.id === slot.adUnitId)?.creativeId ?? ''}`}
                  className="text-xs underline underline-offset-2"
                >
                  Open
                </Link>
              ) : null}
              <button
                type="button"
                aria-label={`Remove ${label} ad space`}
                onClick={() => onChange(slots.filter((_, i) => i !== index))}
                className="text-zinc-400 hover:text-zinc-800"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
        <button
          type="button"
          disabled={slots.length >= 24}
          onClick={() => onChange([...slots, { placement, adUnitId: null }])}
          className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
        >
          <Plus size={12} /> Add ad space
        </button>
      </div>
    </div>
  )
}
