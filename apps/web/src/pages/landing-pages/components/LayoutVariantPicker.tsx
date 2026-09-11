import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Columns2, AlignCenter, Rows3, Shuffle, Newspaper, Check } from 'lucide-react'

// Layout (2026-09-11) — see docs/strategy CLAUDE.md's Layout entry. A structural arrangement of
// this page's EXISTING content: never gates which sections/content exist, never touches Page Type
// or the Page Starter (templateId) — that's why this is a compact inline popover, not the old
// modal "Switch layout"/"Convert page type" flow (LayoutSwitcher, removed). Nothing here can hide
// content, so there's no confirmation step to click through.

export type LayoutVariant = 'STACKED' | 'SPLIT' | 'CENTERED' | 'ALTERNATING' | 'EDITORIAL'

const LAYOUT_OPTIONS: {
  value: LayoutVariant
  label: string
  description: string
  Icon: typeof Rows3
}[] = [
  { value: 'STACKED', label: 'Stacked', description: 'One column, top to bottom', Icon: Rows3 },
  { value: 'SPLIT', label: 'Split', description: 'Copy and media side by side', Icon: Columns2 },
  {
    value: 'CENTERED',
    label: 'Centered',
    description: 'Narrower, centered content',
    Icon: AlignCenter,
  },
  {
    value: 'ALTERNATING',
    label: 'Alternating',
    description: 'Rows mirror side to side',
    Icon: Shuffle,
  },
  {
    value: 'EDITORIAL',
    label: 'Editorial',
    description: 'Bigger type, asymmetric',
    Icon: Newspaper,
  },
]

export function LayoutVariantPicker({
  value,
  onSelect,
}: {
  value: LayoutVariant
  onSelect: (value: LayoutVariant) => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const current = LAYOUT_OPTIONS.find((o) => o.value === value) ?? LAYOUT_OPTIONS[0]!

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-input-border bg-transparent px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/20"
      >
        <span className="shrink-0">Layout</span>
        <span className="max-w-[7rem] truncate text-xs normal-case text-foreground">
          {current.label}
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="listbox"
          aria-label="Layout"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {LAYOUT_OPTIONS.map(({ value: optionValue, label, description, Icon }) => {
            const active = optionValue === value
            return (
              <button
                key={optionValue}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(optionValue)
                  setOpen(false)
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <Icon
                  size={15}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
                {active ? (
                  <Check size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
