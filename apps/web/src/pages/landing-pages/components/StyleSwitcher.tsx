import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ChevronDown, Check } from 'lucide-react'
import {
  PALETTE_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_BUNDLES,
  themeFromAxes,
  matchPalette,
  matchTypography,
  matchShape,
  matchBundle,
  type PaletteOption,
  type TypographyOption,
  type ShapeOption,
} from './pageThemes'

// Pages Phase 4 (2026-09-10) — see docs/strategy/pages-page-types-and-style-axes-roadmap.md §6
// Phase 4. Replaces the old single "Theme" <select> (which only ever picked one of 6 whole
// bundles) with three independent axes — palette, typography, shape — pickable in any
// combination, plus the 6 original bundles kept as one-click shortcuts. Deliberately no
// motion/density controls here: those are Layout-declared affordances, not universal axes (see
// pageThemes.ts's own doc comment) — this component has nothing to show for them by design, not
// by oversight.

function Swatch({ palette }: { palette: PaletteOption }) {
  return (
    <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border">
      <span className="h-full w-1/2" style={{ background: palette.primaryColor }} />
      <span className="h-full w-1/2" style={{ background: palette.backgroundColor }} />
    </span>
  )
}

export function StyleSwitcher({
  theme,
  onTheme,
}: {
  theme: Record<string, string>
  onTheme: (theme: Record<string, string>) => void
}) {
  const [open, setOpen] = useState(false)

  const palette = matchPalette(theme)
  const typography = matchTypography(theme)
  const shape = matchShape(theme)
  const bundle = matchBundle(theme)

  function applyAxes(next: {
    palette?: PaletteOption
    typography?: TypographyOption
    shape?: ShapeOption
  }) {
    onTheme(
      themeFromAxes(next.palette ?? palette, next.typography ?? typography, next.shape ?? shape),
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-input-border bg-transparent px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/20"
      >
        <span className="shrink-0">Style</span>
        <span className="max-w-[7rem] truncate text-xs normal-case text-foreground">
          {bundle?.name ?? 'Custom'}
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open ? (
        <Modal title="Style" onClose={() => setOpen(false)}>
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Quick styles
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_BUNDLES.map((b) => {
                  const bp = PALETTE_OPTIONS.find((p) => p.id === b.paletteId)!
                  const active = bundle?.id === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        applyAxes({
                          palette: bp,
                          typography: TYPOGRAPHY_OPTIONS.find((t) => t.id === b.typographyId),
                          shape: SHAPE_OPTIONS.find((s) => s.id === b.shapeId),
                        })
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors ${active ? 'border-primary bg-accent' : 'border-border bg-surface hover:border-primary/50 hover:bg-accent'}`}
                    >
                      <Swatch palette={bp} />
                      <span className="text-xs font-medium text-foreground">{b.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Palette
              </p>
              <div className="flex flex-wrap gap-2">
                {PALETTE_OPTIONS.map((p) => {
                  const active = p.id === palette.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.name}
                      onClick={() => applyAxes({ palette: p })}
                      className={`relative rounded-full transition-transform ${active ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    >
                      <Swatch palette={p} />
                      {active ? (
                        <Check
                          size={10}
                          className="absolute inset-0 m-auto text-white mix-blend-difference"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Typography
              </p>
              <div className="space-y-1.5">
                {TYPOGRAPHY_OPTIONS.map((t) => {
                  const active = t.id === typography.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyAxes({ typography: t })}
                      className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-colors ${active ? 'border-primary bg-accent' : 'border-border bg-surface hover:border-primary/50 hover:bg-accent'}`}
                    >
                      <span className="text-sm" style={{ fontFamily: t.headingFont }}>
                        {t.name}
                      </span>
                      {active ? <Check size={14} className="text-primary" /> : null}
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Shape
              </p>
              <div className="flex gap-2">
                {SHAPE_OPTIONS.map((s) => {
                  const active = s.id === shape.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applyAxes({ shape: s })}
                      className={`flex flex-1 items-center gap-2 rounded-lg border p-2.5 transition-colors ${active ? 'border-primary bg-accent' : 'border-border bg-surface hover:border-primary/50 hover:bg-accent'}`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 border-2 border-foreground"
                        style={{ borderRadius: s.radius }}
                      />
                      <span className="text-sm text-foreground">{s.name}</span>
                      {active ? <Check size={14} className="ml-auto text-primary" /> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
