import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { LogoItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, type SectionProps } from './shared'
import { SnapPanel } from './SnapPanel'
import { ink } from './tokens'

export function LogoCloudSection({ content, editable, onChange }: SectionProps<'logos'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<LogoItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  const track = items.map((logo, i) => (
    <span
      key={i}
      className="shrink-0 text-2xl font-black uppercase tracking-tight opacity-70"
      style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
    >
      {logo.name}
    </span>
  ))

  return (
    <SnapPanel tone="card" snap={false} className="border-y py-10">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Logos title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Trusted by..."
            className="mb-6 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: ink(50) }}
          />
        ) : (
          <p
            className="mb-6 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: ink(50) }}
          >
            {content?.title}
          </p>
        )}
      </div>

      {editable ? (
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
            {items.map((logo, i) => (
              <div key={i} className="group relative">
                <CanvasText
                  ariaLabel={`Logo ${i + 1} name`}
                  value={logo.name}
                  onChange={(name) => updateItem(i, { name })}
                  className="text-xl font-black uppercase tracking-tight opacity-70"
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                />
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute -right-3 -top-2 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <AddRow
            label="Add logo"
            onClick={() => onChange({ items: [...items, { name: 'New client' }] })}
          />
        </div>
      ) : items.length ? (
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="lp-studio-marquee flex w-max items-center gap-16 py-1">
            {track}
            {track}
          </div>
        </div>
      ) : null}
    </SnapPanel>
  )
}
