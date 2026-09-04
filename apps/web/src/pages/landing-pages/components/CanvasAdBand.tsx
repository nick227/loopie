import { Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdvertisements } from '@project/sdk'
import type { AdSlotDraft } from './adSlots'
import { useAdCatalog } from './useAdCatalog'

// Encodes which of adRunId/advertisementId a <select> option represents, since one dropdown
// offers both kinds of candidate (Ad Designer, 2026-09-03).
function optionValue(kind: 'run' | 'ad', id: string) {
  return `${kind}:${id}`
}
function parseOptionValue(value: string): {
  adRunId: string | null
  advertisementId: string | null
} {
  if (!value) return { adRunId: null, advertisementId: null }
  const [kind, id] = value.split(':')
  return {
    adRunId: kind === 'run' ? (id ?? null) : null,
    advertisementId: kind === 'ad' ? (id ?? null) : null,
  }
}

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
  // Ad Designer creatives — a saved Poster/Story/Feed Post placed by direct reference. Only
  // published ones are offered (an unpublished draft has nothing to render). See CLAUDE.md's Ad
  // Designer "Pages integration" — reference, never copy.
  const advertisements = (useAdvertisements({ limit: 100 }).data?.data ?? []).filter(
    (ad) => ad.format && ad.lastPublishedAt,
  )
  const indexes = slots.flatMap((slot, index) => (slot.placement === placement ? [index] : []))

  function patch(index: number, value: string) {
    const parsed = parseOptionValue(value)
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...parsed } : slot)))
  }

  const noCandidates = catalog.units.length === 0 && advertisements.length === 0

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
        {!catalog.loading && !catalog.failed && noCandidates && indexes.length === 0 ? (
          <span className="text-xs opacity-70">
            No Page-ready Ads.{' '}
            <Link to="/ads" className="underline underline-offset-2">
              Create an ad
            </Link>
          </span>
        ) : null}
        {indexes.map((index) => {
          const slot = slots[index]!
          const value = slot.advertisementId
            ? optionValue('ad', slot.advertisementId)
            : slot.adRunId
              ? optionValue('run', slot.adRunId)
              : ''
          return (
            <div key={index} className="flex min-w-[12rem] flex-1 items-center gap-2">
              <select
                aria-label="Ad"
                disabled={catalog.loading || catalog.failed}
                value={value}
                onChange={(e) => patch(index, e.target.value)}
                className="h-8 flex-1 rounded border bg-transparent px-2 text-xs"
                style={{ borderColor: 'color-mix(in srgb, var(--lp-ink) 18%, var(--lp-bg))' }}
              >
                <option value="">Advertisement</option>
                {advertisements.length ? (
                  <optgroup label="Ad Designer creatives">
                    {advertisements.map((ad) => (
                      <option key={ad.id} value={optionValue('ad', ad.id)}>
                        {ad.name} · {ad.format}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {catalog.units.length ? (
                  <optgroup label="Ad runs">
                    {catalog.units.map((unit) => (
                      <option key={unit.id} value={optionValue('run', unit.id)}>
                        {catalog.labelFor(unit)}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
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
          disabled={slots.length >= 24 || catalog.loading || catalog.failed || noCandidates}
          aria-label="Add ad space"
          onClick={() => onChange([...slots, { placement, adRunId: null, advertisementId: null }])}
          className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
        >
          <Plus size={12} /> Ad
        </button>
      </div>
    </div>
  )
}
