import { useCampaigns, useLandingPageTemplates } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ExternalLink } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

const FONT_STACKS = [
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  'Georgia, "Times New Roman", serif',
  'system-ui, sans-serif',
  'ui-monospace, Menlo, monospace',
]

const TOKEN_LABEL: Record<string, string> = {
  primaryColor: 'Accent',
  backgroundColor: 'Page',
  fontFamily: 'Type',
}

export function PageToolbar({
  templateId,
  theme,
  themeTokens,
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
  theme: Record<string, string>
  themeTokens: string[]
  published: boolean
  campaignId: string
  destinationPending: boolean
  destinationOk: boolean
  onTemplate: (templateId: string) => void
  onTheme: (token: string, value: string) => void
  onCampaign: (campaignId: string) => void
  onSetDestination: () => void
}) {
  const templates = useFlatPages(useLandingPageTemplates())
  const campaigns = useFlatPages(useCampaigns())
  const fonts = FONT_STACKS.includes(theme.fontFamily ?? '')
    ? FONT_STACKS
    : [theme.fontFamily ?? FONT_STACKS[0]!, ...FONT_STACKS]

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-input-border bg-card px-3 py-2.5">
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        Layout
        <select
          aria-label="Layout"
          value={templateId}
          onChange={(e) => onTemplate(e.target.value)}
          className="flex h-9 w-full rounded border border-input-border bg-transparent px-2 text-sm text-foreground"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      {themeTokens.map((token) => (
        <div key={token} className="flex min-w-[8rem] flex-col gap-1">
          <label
            htmlFor={`lp-theme-${token}`}
            className="text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            {TOKEN_LABEL[token] ?? token}
          </label>
          {token === 'fontFamily' ? (
            <select
              id={`lp-theme-${token}`}
              aria-label={token}
              value={theme[token] ?? ''}
              onChange={(e) => onTheme(token, e.target.value)}
              className="flex h-9 rounded border border-input-border bg-transparent px-2 text-sm"
            >
              {fonts.map((stack) => (
                <option key={stack} value={stack}>
                  {stack.split(',')[0]!.replace(/"/g, '')}
                </option>
              ))}
            </select>
          ) : /color/i.test(token) ? (
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(theme[token] ?? '') ? theme[token] : '#000000'}
                onChange={(e) => onTheme(token, e.target.value)}
                className="h-9 w-9 shrink-0 rounded border border-input-border"
              />
              <Input
                id={`lp-theme-${token}`}
                aria-label={token}
                value={theme[token] ?? ''}
                onChange={(e) => onTheme(token, e.target.value)}
                className="h-9"
              />
            </div>
          ) : (
            <Input
              id={`lp-theme-${token}`}
              value={theme[token] ?? ''}
              onChange={(e) => onTheme(token, e.target.value)}
            />
          )}
        </div>
      ))}
      {published ? (
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="flex min-w-[12rem] flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Campaign
            <select
              aria-label="Campaign"
              value={campaignId}
              onChange={(e) => onCampaign(e.target.value)}
              className="flex h-9 rounded border border-input-border bg-transparent px-2 text-sm"
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
