import { LayoutVariantPicker, type LayoutVariant } from './LayoutVariantPicker'
import { StyleSwitcher } from './StyleSwitcher'

export function PageToolbar({
  layoutVariant,
  theme,
  onLayoutVariant,
  onTheme,
}: {
  layoutVariant: LayoutVariant
  theme: Record<string, string>
  onLayoutVariant: (value: LayoutVariant) => void
  onTheme: (theme: Record<string, string>) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <LayoutVariantPicker value={layoutVariant} onSelect={onLayoutVariant} />
      <StyleSwitcher theme={theme} onTheme={onTheme} />
    </div>
  )
}
