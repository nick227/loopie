import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { LogoItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, Eyebrow, type SectionProps } from './shared'
import { FrameInner, SnapPanel } from './SnapPanel'
import { ink } from './tokens'

export function LogoCloudSection({ content, editable, onChange }: SectionProps<'logos'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<LogoItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  const names = items.map((logo, i) => (
    <span
      key={i}
      className="shrink-0 text-lg font-semibold tracking-tight opacity-55"
      style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
    >
      {logo.name}
    </span>
  ))

  return (
    <SnapPanel tone="clear" snap={false} fill={false}>
      <FrameInner className="py-12 lg:py-14">
        {editable ? (
          <CanvasText
            ariaLabel="Logos title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Trusted by..."
            className="mb-6"
            style={{ color: ink(50) }}
          />
        ) : content?.title ? (
          <Eyebrow muted>{content.title}</Eyebrow>
        ) : null}

        {editable ? (
          <>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
              {items.map((logo, i) => (
                <div key={i} className="group relative">
                  <CanvasText
                    ariaLabel={`Logo ${i + 1} name`}
                    value={logo.name}
                    onChange={(name) => updateItem(i, { name })}
                    className="text-lg font-semibold tracking-tight opacity-70"
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
          </>
        ) : items.length ? (
          <div className="-mx-6 overflow-hidden sm:-mx-8 lg:-mx-12 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="lp-studio-marquee flex w-max items-center gap-14 px-6 py-1">
              {names}
              {names}
            </div>
          </div>
        ) : null}
      </FrameInner>
    </SnapPanel>
  )
}
