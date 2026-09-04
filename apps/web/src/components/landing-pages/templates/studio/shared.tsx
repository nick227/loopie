import { Plus } from 'lucide-react'
import type { PageContent } from '../../../../pages/landing-pages/components/types'
import { ink, LABEL } from './tokens'

export type SectionProps<K extends keyof PageContent> = {
  content: PageContent[K]
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent[K]>>) => void
}

export function AddRow({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
      style={{ color: ink(55) }}
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

export function Eyebrow({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <p
      className={`${LABEL} mb-5`}
      style={{ color: muted ? ink(50) : 'currentColor', opacity: muted ? 1 : 0.55 }}
    >
      {children}
    </p>
  )
}

export function SolidCta({
  children,
  href,
  inverted = false,
}: {
  children: React.ReactNode
  href?: string
  inverted?: boolean
}) {
  const className =
    'inline-flex items-center gap-2 self-start px-5 py-3 text-sm font-semibold tracking-wide transition-opacity hover:opacity-80'
  const style: React.CSSProperties = inverted
    ? { backgroundColor: 'var(--lp-bg)', color: 'var(--lp-ink)' }
    : { backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)' }

  if (href) {
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    )
  }
  return (
    <span className={className} style={style}>
      {children}
    </span>
  )
}
