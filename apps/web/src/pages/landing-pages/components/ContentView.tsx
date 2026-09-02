import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAsset } from '@project/sdk'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { GalleryAddButton } from './editable/GalleryAddButton'
import { mediaSrc } from '@/lib/media'
import {
  KNOWN_SLOT_GROUPS,
  SECTION_TYPE_TO_SLOT_GROUP,
  type GalleryItem,
  type LayoutConfig,
  type PageContent,
  type SlotGroupKey,
  type TemplateSection,
} from './types'

type FieldKind = 'text' | 'richtext' | 'link' | 'media' | 'list' | 'gallery'
type FieldSpec = { key: string; label: string; kind: FieldKind; itemFields?: FieldSpec[] }

// The Content tab's field manifest — one flat form over every canonical slot group, regardless of
// which template is active. A slot group's fields render enabled when the current template's
// schema uses that group, disabled (value preserved, greyed out) otherwise. This is what lets a
// page carry content between templates: nothing here is a separate copy of what the visual
// Editor tab edits — same content, same onChange callbacks, just a flat-form view onto it.
const SLOT_GROUP_LABELS: Record<SlotGroupKey, string> = {
  nav: 'Navigation',
  hero: 'Hero',
  intro: 'Intro',
  media: 'Media',
  webinar: 'Event details',
  features: 'Features',
  services: 'Services',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  logos: 'Logos',
  metrics: 'Metrics',
  comparison: 'Comparison',
  footer: 'Footer',
}

const SLOT_GROUP_FIELDS: Record<SlotGroupKey, FieldSpec[]> = {
  nav: [
    { key: 'brand', label: 'Brand', kind: 'text' },
    {
      key: 'links',
      label: 'Nav links',
      kind: 'list',
      itemFields: [
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'url', label: 'URL', kind: 'text' },
      ],
    },
  ],
  hero: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    { key: 'media', label: 'Media', kind: 'media' },
    { key: 'primaryCta', label: 'Primary CTA', kind: 'link' },
  ],
  intro: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
  ],
  media: [{ key: 'url', label: 'Media URL', kind: 'text' }],
  webinar: [
    { key: 'eventDate', label: 'Event date (ISO)', kind: 'text' },
    { key: 'durationMinutes', label: 'Duration (minutes)', kind: 'text' },
    { key: 'seatsTotal', label: 'Seats capacity', kind: 'text' },
    { key: 'hostName', label: 'Host name', kind: 'text' },
    { key: 'hostTitle', label: 'Host title', kind: 'text' },
    { key: 'hostAvatarUrl', label: 'Host photo URL', kind: 'text' },
    { key: 'hostBio', label: 'Host bio', kind: 'richtext' },
  ],
  features: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    {
      key: 'items',
      label: 'Features',
      kind: 'list',
      itemFields: [
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'body', label: 'Body', kind: 'text' },
      ],
    },
  ],
  services: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    {
      key: 'items',
      label: 'Services',
      kind: 'list',
      itemFields: [
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'headline', label: 'Headline', kind: 'text' },
        { key: 'description', label: 'Description', kind: 'text' },
      ],
    },
  ],
  gallery: [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'items', label: 'Photos', kind: 'gallery' },
  ],
  testimonials: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    {
      key: 'items',
      label: 'Testimonials',
      kind: 'list',
      itemFields: [
        { key: 'quote', label: 'Quote', kind: 'text' },
        { key: 'author', label: 'Author', kind: 'text' },
        { key: 'role', label: 'Role', kind: 'text' },
      ],
    },
  ],
  faq: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    {
      key: 'items',
      label: 'Questions',
      kind: 'list',
      itemFields: [
        { key: 'question', label: 'Question', kind: 'text' },
        { key: 'answer', label: 'Answer', kind: 'text' },
      ],
    },
  ],
  logos: [
    { key: 'title', label: 'Title', kind: 'text' },
    {
      key: 'items',
      label: 'Logos',
      kind: 'list',
      itemFields: [{ key: 'name', label: 'Name', kind: 'text' }],
    },
  ],
  metrics: [
    {
      key: 'items',
      label: 'Metrics',
      kind: 'list',
      itemFields: [
        { key: 'value', label: 'Value', kind: 'text' },
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'description', label: 'Description', kind: 'text' },
      ],
    },
  ],
  comparison: [
    { key: 'title', label: 'Title', kind: 'text' },
    {
      key: 'items',
      label: 'Rows',
      kind: 'list',
      itemFields: [
        { key: 'feature', label: 'Feature', kind: 'text' },
        { key: 'us', label: 'Us', kind: 'text' },
        { key: 'them', label: 'Them', kind: 'text' },
      ],
    },
  ],
  footer: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    { key: 'cta', label: 'CTA', kind: 'link' },
  ],
}

function getField(record: Record<string, unknown>, key: string) {
  return record[key]
}

function TextField({
  label,
  ariaLabel,
  value,
  disabled,
  multiline,
  onChange,
}: {
  label: string
  ariaLabel?: string
  value: string
  disabled: boolean
  multiline?: boolean
  onChange: (value: string) => void
}) {
  const Comp = multiline ? Textarea : Input
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <Comp
        aria-label={ariaLabel ?? label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? 2 : undefined}
      />
    </label>
  )
}

function LinkField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: { label?: string; url?: string }
  disabled: boolean
  onChange: (next: { label?: string; url?: string }) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <Input
          aria-label={`${label} label`}
          placeholder="Label"
          value={value.label ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
        <Input
          aria-label={`${label} URL`}
          placeholder="URL"
          value={value.url ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
        />
      </div>
    </div>
  )
}

function ListField({
  spec,
  items,
  disabled,
  onChange,
}: {
  spec: FieldSpec
  items: Record<string, unknown>[]
  disabled: boolean
  onChange: (items: Record<string, unknown>[]) => void
}) {
  const itemFields = spec.itemFields ?? []
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{spec.label}</span>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative rounded-lg border border-border bg-surface/30 p-2.5 pr-8"
          >
            <div className="space-y-1.5">
              {itemFields.map((field) => (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={String(getField(item, field.key) ?? '')}
                  disabled={disabled}
                  onChange={(value) =>
                    onChange(
                      items.map((row, idx) => (idx === i ? { ...row, [field.key]: value } : row)),
                    )
                  }
                />
              ))}
            </div>
            {!disabled ? (
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {!disabled ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1.5"
          onClick={() =>
            onChange([...items, Object.fromEntries(itemFields.map((f) => [f.key, '']))])
          }
        >
          <Plus size={14} /> Add {spec.label.replace(/s$/, '')}
        </Button>
      ) : null}
    </div>
  )
}

// Items added via GalleryAddButton only carry an `assetId` (no `.url`/`.src`) — resolve it the
// same way MediaSlotField does for every other asset-backed media slot in this app.
function useResolvedGalleryThumb(item: GalleryItem): string | null {
  const assetQuery = useAsset(item.assetId ?? '')
  if (item.src) return item.src
  if (item.assetId) return assetQuery.data?.data ? mediaSrc(assetQuery.data.data.url) : null
  if (item.url) return mediaSrc(item.url)
  return null
}

function GalleryThumb({
  item,
  index,
  disabled,
  onCaptionChange,
  onRemove,
}: {
  item: GalleryItem
  index: number
  disabled: boolean
  onCaptionChange: (caption: string) => void
  onRemove: () => void
}) {
  const src = useResolvedGalleryThumb(item)
  return (
    <div className="group relative">
      {src ? (
        <img src={src} alt="" className="aspect-square w-full rounded-md object-cover" />
      ) : (
        <div className="aspect-square w-full rounded-md bg-surface/50" />
      )}
      <input
        aria-label={`Photo ${index + 1} caption`}
        placeholder="Caption"
        value={item.caption ?? ''}
        disabled={disabled}
        onChange={(e) => onCaptionChange(e.target.value)}
        className="mt-1 w-full rounded border-0 bg-transparent p-0 text-[11px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
      />
      {!disabled ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground opacity-0 shadow group-hover:opacity-100 hover:text-destructive"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  )
}

function GalleryField({
  label,
  items,
  disabled,
  onChange,
}: {
  label: string
  items: GalleryItem[]
  disabled: boolean
  onChange: (items: GalleryItem[]) => void
}) {
  function update(i: number, patch: Partial<GalleryItem>) {
    onChange(items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item, i) => (
          <GalleryThumb
            key={i}
            item={item}
            index={i}
            disabled={disabled}
            onCaptionChange={(caption) => update(i, { caption })}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>
      {!disabled ? (
        <GalleryAddButton
          className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          onAdd={(assetIds) => onChange([...items, ...assetIds.map((assetId) => ({ assetId }))])}
        />
      ) : null}
    </div>
  )
}

export function ContentView({
  content,
  sections,
  layoutConfig,
  onSlot,
  onLayoutConfig,
}: {
  content: PageContent
  sections: TemplateSection[]
  layoutConfig: LayoutConfig
  onSlot: (slotGroup: SlotGroupKey, next: unknown) => void
  onLayoutConfig: (next: LayoutConfig) => void
}) {
  const sectionByGroup = new Map<SlotGroupKey, TemplateSection>()
  for (const section of sections) {
    const group = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    if (group && !sectionByGroup.has(group)) sectionByGroup.set(group, section)
  }
  const enabledGroups = new Set(sectionByGroup.keys())

  const visibleGroups = KNOWN_SLOT_GROUPS.filter((group) => {
    const hasData = content[group] && Object.keys(content[group] as object).length > 0
    return enabledGroups.has(group) || hasData
  })

  if (visibleGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">This page has no content yet.</p>
  }

  function toggleVisibility(sectionKey: string) {
    const current = layoutConfig.sections?.[sectionKey] ?? {}
    onLayoutConfig({
      ...layoutConfig,
      sections: { ...layoutConfig.sections, [sectionKey]: { ...current, hidden: !current.hidden } },
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {visibleGroups.map((group) => {
        const enabled = enabledGroups.has(group)
        const section = sectionByGroup.get(group)
        const hidden = section ? (layoutConfig.sections?.[section.key]?.hidden ?? false) : false
        const groupContent = (content[group] as Record<string, unknown> | undefined) ?? {}
        const fields = SLOT_GROUP_FIELDS[group]
        return (
          <div
            key={group}
            className="self-start rounded-xl border border-input-border bg-card p-3.5"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{SLOT_GROUP_LABELS[group]}</p>
              <div className="flex items-center gap-2">
                {!enabled ? (
                  <span className="text-[11px] text-muted-foreground">Not in current layout</span>
                ) : section?.hideable ? (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(section.key)}
                    aria-label={
                      hidden
                        ? `Show ${SLOT_GROUP_LABELS[group]}`
                        : `Hide ${SLOT_GROUP_LABELS[group]}`
                    }
                    title={
                      hidden
                        ? 'Hidden on the page — click to show'
                        : 'Visible on the page — click to hide'
                    }
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2.5">
              {fields.map((field) => {
                const set = (patch: Record<string, unknown>) =>
                  onSlot(group, { ...groupContent, ...patch })
                if (field.kind === 'list') {
                  return (
                    <ListField
                      key={field.key}
                      spec={field}
                      items={(getField(groupContent, field.key) as Record<string, unknown>[]) ?? []}
                      disabled={!enabled}
                      onChange={(items) => set({ [field.key]: items })}
                    />
                  )
                }
                if (field.kind === 'gallery') {
                  return (
                    <GalleryField
                      key={field.key}
                      label={field.label}
                      items={(getField(groupContent, field.key) as GalleryItem[]) ?? []}
                      disabled={!enabled}
                      onChange={(items) => set({ [field.key]: items })}
                    />
                  )
                }
                if (field.kind === 'link') {
                  return (
                    <LinkField
                      key={field.key}
                      label={field.label}
                      value={
                        (getField(groupContent, field.key) as { label?: string; url?: string }) ??
                        {}
                      }
                      disabled={!enabled}
                      onChange={(next) => set({ [field.key]: next })}
                    />
                  )
                }
                if (field.kind === 'media') {
                  const media = (getField(groupContent, field.key) as { url?: string }) ?? {}
                  return (
                    <TextField
                      key={field.key}
                      label={`${field.label} URL`}
                      ariaLabel={`${SLOT_GROUP_LABELS[group]} ${field.label} URL`}
                      value={media.url ?? ''}
                      disabled={!enabled}
                      onChange={(url) => set({ [field.key]: { ...media, url } })}
                    />
                  )
                }
                return (
                  <TextField
                    key={field.key}
                    label={field.label}
                    ariaLabel={`${SLOT_GROUP_LABELS[group]} ${field.label}`}
                    value={String(getField(groupContent, field.key) ?? '')}
                    disabled={!enabled}
                    multiline={field.kind === 'richtext'}
                    onChange={(value) => set({ [field.key]: value })}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
