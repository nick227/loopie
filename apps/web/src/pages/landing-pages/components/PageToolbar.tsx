import { useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'
import { ChevronDown } from 'lucide-react'
import {
  matchThemePreset,
  presetsFromSchema,
  themeFromPreset,
  type PageThemePreset,
} from './pageThemes'

const selectClass =
  'h-full min-w-0 appearance-none border-0 min-w-[250px] bg-transparent py-0 pl-1.5 pr-5 text-xs font-medium text-foreground focus:outline-none'

function SelectChevron() {
  return (
    <ChevronDown
      size={12}
      aria-hidden="true"
      className="pointer-events-none absolute right-1.5 text-muted-foreground"
    />
  )
}

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
    <div className="flex shrink-0 items-center gap-1.5">
      <label className="relative inline-flex h-8 min-w-0 items-center gap-1 rounded-lg border border-input-border bg-transparent pl-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring">
        <span className="shrink-0">Layout</span>
        <select
          aria-label="Layout"
          value={templateId}
          onChange={(event) => onTemplate(event.target.value)}
          className={`${selectClass} w-[6.75rem]`}
        >
          <option value="" disabled>
            Select layout
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <SelectChevron />
      </label>

      <label className="relative inline-flex h-8 min-w-0 items-center gap-1 rounded-lg border border-input-border bg-transparent pl-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring">
        <span className="shrink-0">Theme</span>
        <select
          aria-label="Theme"
          value={selected.id}
          onChange={(event) => {
            const preset = presets.find((row: PageThemePreset) => row.id === event.target.value)
            if (preset) onTheme(themeFromPreset(preset))
          }}
          className={`${selectClass} w-[5.25rem]`}
        >
          <option value="" disabled>
            Select theme
          </option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <SelectChevron />
      </label>
    </div>
  )
}
