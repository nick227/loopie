import { useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'
import {
  matchThemePreset,
  presetsFromSchema,
  themeFromPreset,
  type PageThemePreset,
} from './pageThemes'

const selectClass =
  'flex h-9 w-full rounded border border-input-border bg-transparent px-2 text-sm text-foreground'

export function PageToolbar({
  templateId,
  templateSchema,
  theme,
  onTemplate,
  onTheme,
}: {
  templateId: string
  templateSchema: unknown
  theme: Record<string, string>
  onTemplate: (templateId: string) => void
  onTheme: (theme: Record<string, string>) => void
}) {
  const templates = useFlatPages(useLandingPageTemplates())
  const presets = presetsFromSchema(templateSchema)
  const selected = matchThemePreset(theme, presets)

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-input-border bg-card px-3 py-2.5">
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        Layout
        <select
          aria-label="Layout"
          value={templateId}
          onChange={(e) => onTemplate(e.target.value)}
          className={selectClass}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        Theme
        <select
          aria-label="Theme"
          value={selected.id}
          onChange={(e) => {
            const preset = presets.find((row: PageThemePreset) => row.id === e.target.value)
            if (preset) onTheme(themeFromPreset(preset))
          }}
          className={selectClass}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
