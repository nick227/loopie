import { Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AdSlotDraft } from './adSlots'
import { useAdCatalog } from './useAdCatalog'

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
  const indexes = slots.flatMap((slot, index) => (slot.placement === placement ? [index] : []))

  function patch(index: number, adUnitId: string | null) {
    onChange(slots.map((slot, i) => (i === index ? { ...slot, adUnitId } : slot)))
  }

  return (
    <div className="px-6 py-3">
      <div
        className="mx-auto flex max-w-[1040px] min-h-[90px] items-center justify-center gap-2 rounded border border-dashed px-3"
        style={{
          borderColor: 'color-mix(in srgb, var(--lp-ink) 18%, var(--lp-bg))',
          backgroundColor: 'color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg))',
          color: 'var(--lp-ink)',
        }}
      >
        {catalog.loading && indexes.length === 0 ? (
          <span className="text-xs opacity-70">Loading available Ads…</span>
        ) : null}
        {catalog.failed && indexes.length === 0 ? (
          <span role="alert" className="text-xs opacity-70">
            Ads could not be loaded.
          </span>
        ) : null}
        {!catalog.loading &&
        !catalog.failed &&
        catalog.units.length === 0 &&
        indexes.length === 0 ? (
          <span className="text-xs opacity-70">
            No Page-ready Ads.{' '}
            <Link to="/ads" className="underline underline-offset-2">
              Create an ad
            </Link>
          </span>
        ) : null}
        {indexes.map((index) => {
          const slot = slots[index]!
          return (
            <div key={index} className="flex min-w-[12rem] flex-1 items-center gap-2">
              <select
                aria-label="Ad"
                disabled={catalog.loading || catalog.failed}
                value={slot.adUnitId ?? ''}
                onChange={(e) => patch(index, e.target.value || null)}
                className="h-8 flex-1 rounded border bg-transparent px-2 text-xs"
                style={{ borderColor: 'color-mix(in srgb, var(--lp-ink) 18%, var(--lp-bg))' }}
              >
                <option value="">Advertisement</option>
                {catalog.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {catalog.labelFor(unit)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Remove ad space"
                onClick={() => onChange(slots.filter((_, i) => i !== index))}
                className="opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
        <button
          type="button"
          disabled={
            slots.length >= 24 || catalog.loading || catalog.failed || catalog.units.length === 0
          }
          aria-label="Add ad space"
          onClick={() => onChange([...slots, { placement, adUnitId: null }])}
          className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
        >
          <Plus size={12} /> Ad
        </button>
      </div>
    </div>
  )
}
