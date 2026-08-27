import { useCampaigns, useLandingPageTemplates } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from 'lucide-react'
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
  published,
  campaignId,
  destinationPending,
  destinationOk,
  onTemplate,
  onTheme,
  onCampaign,
  onSetDestination,
}: {
  templateId: string
  templateSchema: unknown
  theme: Record<string, string>
  published: boolean
  campaignId: string
  destinationPending: boolean
  destinationOk: boolean
  onTemplate: (templateId: string) => void
  onTheme: (theme: Record<string, string>) => void
  onCampaign: (campaignId: string) => void
  onSetDestination: () => void
}) {
  const templates = useFlatPages(useLandingPageTemplates())
  const campaigns = useFlatPages(useCampaigns())
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
      {published ? (
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="flex min-w-[12rem] flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Campaign
            <select
              aria-label="Campaign"
              value={campaignId}
              onChange={(e) => onCampaign(e.target.value)}
              className={selectClass}
            >
              <option value="">Set as destination…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={onSetDestination}
            loading={destinationPending}
            disabled={!campaignId}
          >
            <ExternalLink size={14} /> Set as Destination
          </Button>
          {destinationOk ? (
            <span className="pb-2 text-xs text-muted-foreground">
              Campaign destination updated.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
