import { LayoutSwitcher } from './LayoutSwitcher'
import { StyleSwitcher } from './StyleSwitcher'

export function PageToolbar({
  landingPageId,
  templateId,
  theme,
  onTemplate,
  onTheme,
}: {
  landingPageId: string
  templateId: string
  // Style axes are universal (Pages Phase 4) — no longer scoped by the Layout's own schema, so
  // templateSchema is no longer read here. Kept out of the prop list rather than left unused.
  templateSchema?: unknown
  theme: Record<string, string>
  onTemplate: (templateId: string) => void
  onTheme: (theme: Record<string, string>) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <LayoutSwitcher landingPageId={landingPageId} templateId={templateId} onSelect={onTemplate} />
      <StyleSwitcher theme={theme} onTheme={onTheme} />
    </div>
  )
}
