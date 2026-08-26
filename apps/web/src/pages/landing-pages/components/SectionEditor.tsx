import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LabeledInput } from './LabeledInput'
import { FeatureGridEditor } from './FeatureGridEditor'
import { TemplateSection, SectionContent } from './types'

export function SectionEditor({
  section,
  content,
  onChange,
}: {
  section: TemplateSection
  content: SectionContent
  onChange: (next: SectionContent) => void
}) {
  const set = (patch: Record<string, unknown>) => onChange({ ...content, ...patch })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <p className="text-sm font-medium capitalize">{section.key.replace(/-/g, ' ')}</p>
          <p className="text-xs text-muted-foreground">{section.type}</p>
        </div>
        {section.hideable && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!content.hidden}
              onChange={(e) => set({ hidden: !e.target.checked })}
              className="h-4 w-4 rounded border-input-border"
            />
            Visible
          </label>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {section.type === 'hero' && (
          <>
            <LabeledInput
              label="Headline"
              value={content.headline ?? ''}
              onChange={(v) => set({ headline: v })}
            />
            <LabeledInput
              label="Subheadline"
              value={content.subheadline ?? ''}
              onChange={(v) => set({ subheadline: v })}
            />
            <LabeledInput
              label="CTA label"
              value={content.ctaLabel ?? ''}
              onChange={(v) => set({ ctaLabel: v })}
            />
            <LabeledInput
              label="CTA link"
              value={content.ctaLink ?? ''}
              onChange={(v) => set({ ctaLink: v })}
            />
          </>
        )}
        {section.type === 'feature-grid' && (
          <FeatureGridEditor items={content.items ?? []} onChange={(items) => set({ items })} />
        )}
        {section.type === 'form-embed' && (
          <p className="text-sm text-muted-foreground">Uses the form selected below.</p>
        )}
        {section.type === 'footer' && (
          <LabeledInput
            label="Footer text"
            value={content.text ?? ''}
            onChange={(v) => set({ text: v })}
          />
        )}
      </CardContent>
    </Card>
  )
}
