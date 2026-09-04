import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import type { NavLink } from '../../../../pages/landing-pages/components/types'
import type { SectionProps } from './shared'
import { ink, LABEL } from './tokens'

export function NavBar({ content, editable, onChange }: SectionProps<'nav'>) {
  const brand = content?.brand ?? ''
  const links = content?.links ?? []
  const primary = links[0]

  function updateLink(i: number, patch: Partial<NavLink>) {
    onChange({ links: links.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: ink(10),
        backgroundColor: 'color-mix(in srgb, var(--lp-bg) 90%, transparent)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6 sm:px-8 lg:px-12">
        {editable ? (
          <CanvasText
            ariaLabel="Brand name"
            value={brand}
            onChange={(next) => onChange({ brand: next })}
            placeholder="Studio name"
            style={{ color: 'var(--lp-ink)', fontFamily: 'var(--lp-heading)' }}
            className="text-base font-bold tracking-tight w-auto"
          />
        ) : (
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: 'var(--lp-ink)', fontFamily: 'var(--lp-heading)' }}
          >
            {brand}
          </span>
        )}

        {editable ? (
          <EditableLinkTrigger
            label={primary?.label ?? ''}
            url={primary?.url ?? '#contact'}
            onChange={(next) => (links.length ? updateLink(0, next) : onChange({ links: [next] }))}
          >
            <span className={LABEL} style={{ color: 'var(--lp-ink)' }}>
              {primary?.label || 'Add a link'}
            </span>
          </EditableLinkTrigger>
        ) : primary?.label ? (
          <a href={primary.url} className={LABEL} style={{ color: 'var(--lp-ink)' }}>
            {primary.label}
          </a>
        ) : null}
      </div>
    </header>
  )
}
