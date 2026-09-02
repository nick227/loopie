import { useEffect, useId, useRef, useState } from 'react'
import { useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'
import { ChevronDown, Palette } from 'lucide-react'
import {
  matchThemePreset,
  presetsFromSchema,
  themeFromPreset,
  type PageThemePreset,
} from './pageThemes'

const selectClass =
  'flex h-8 w-full rounded-md border border-input-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

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
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const templates = useFlatPages(useLandingPageTemplates())
  const presets = presetsFromSchema(templateSchema)
  const selected = matchThemePreset(theme, presets)
  const swatch = theme.primaryColor ?? '#0B3D91'

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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input-border bg-transparent px-2.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Palette size={14} aria-hidden="true" />
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full border border-foreground/15"
          style={{ backgroundColor: swatch }}
        />
        <span className="hidden sm:inline">Appearance</span>
        <ChevronDown size={13} aria-hidden="true" className="text-muted-foreground" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Page appearance"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-64 space-y-3 rounded-xl border border-border bg-popover p-3 shadow-lg"
        >
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
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
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
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
      ) : null}
    </div>
  )
}
