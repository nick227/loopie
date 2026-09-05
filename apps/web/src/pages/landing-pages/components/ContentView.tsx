import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useAsset } from '@project/sdk'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { GalleryAddButton } from './editable/GalleryAddButton'
import { BrowserFaviconField } from './BrowserFaviconField'
import { mediaSrc } from '@/lib/media'
import {
  SECTION_TYPE_TO_SLOT_GROUP,
  sectionAnchorId,
  type GalleryItem,
  type LayoutConfig,
  type PageBrowserSettings,
  type PageContent,
  type SlotGroupKey,
  type TemplateSection,
} from './types'

type FieldKind = 'text' | 'richtext' | 'link' | 'media' | 'list' | 'gallery' | 'anchor'
type FieldSpec = { key: string; label: string; kind: FieldKind; itemFields?: FieldSpec[] }
type AnchorOption = { value: string; label: string }

// The Content tab's field manifest — one flat form over every canonical slot group a section type
// actually uses. Same content, same onChange callbacks as the visual Editor tab — nothing here is
// a separate copy of that content, just a flat-form view onto it.
const SLOT_GROUP_LABELS: Record<SlotGroupKey, string> = {
  nav: 'Navigation',
  hero: 'Hero',
  intro: 'Intro',
  media: 'Media',
  webinar: 'Event details',
  features: 'Features',
  services: 'Services',
  gallery: 'Gallery',
  team: 'Team',
  products: 'Products',
  categories: 'Categories',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  logos: 'Logos',
  metrics: 'Metrics',
  comparison: 'Comparison',
  footer: 'Footer',
}

// A section's *type* sometimes carries its own conventional anchor/label regardless of which slot
// group backs it (a contact-style footer is always "Contact", a lead form is always "Form") — see
// sectionAnchorId in ./types, which this mirrors on the label side.
const ANCHOR_LABEL_OVERRIDES: Record<string, string> = {
  'form-embed': 'Form',
  footer: 'Contact',
  'cta-band': 'Contact',
  'studio-contact': 'Contact',
  'webinar-widget': 'Sign up',
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
        { key: 'url', label: 'Goes to', kind: 'anchor' },
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
    { key: 'media', label: 'Media', kind: 'media' },
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
  team: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    {
      key: 'items',
      label: 'People',
      kind: 'list',
      itemFields: [
        { key: 'name', label: 'Name', kind: 'text' },
        { key: 'role', label: 'Role', kind: 'text' },
        { key: 'bio', label: 'Bio', kind: 'text' },
      ],
    },
  ],
  products: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'richtext' },
    {
      key: 'items',
      label: 'Products',
      kind: 'list',
      itemFields: [
        { key: 'name', label: 'Name', kind: 'text' },
        { key: 'price', label: 'Price', kind: 'text' },
        { key: 'badge', label: 'Badge', kind: 'text' },
      ],
    },
  ],
  categories: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    {
      key: 'items',
      label: 'Categories',
      kind: 'list',
      itemFields: [
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'url', label: 'URL', kind: 'text' },
      ],
    },
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

// A default/empty shell for a slot group's content — used both to seed a freshly-added section
// (so its list/gallery "Add …" affordances are ready immediately) and, implicitly, as the "empty"
// baseline the delete confirmation compares against.
function defaultContentForGroup(group: SlotGroupKey): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of SLOT_GROUP_FIELDS[group]) {
    if (field.kind === 'list' || field.kind === 'gallery') out[field.key] = []
  }
  return out
}

// How many of this section's editable fields are actually filled in, out of how many are
// currently available to fill (list/gallery items only count once they exist — an empty list
// isn't "3 missing fields", it's a section with nothing added yet).
function computeFieldStats(fields: FieldSpec[], data: Record<string, unknown>) {
  let filled = 0
  let total = 0
  for (const field of fields) {
    if (field.kind === 'list') {
      const items = (getField(data, field.key) as Record<string, unknown>[] | undefined) ?? []
      const itemFields = field.itemFields ?? []
      total += items.length * itemFields.length
      for (const item of items) {
        for (const itemField of itemFields) {
          if (String(getField(item, itemField.key) ?? '').trim()) filled += 1
        }
      }
      continue
    }
    if (field.kind === 'gallery') {
      const items = (getField(data, field.key) as unknown[] | undefined) ?? []
      total += 1
      if (items.length > 0) filled += 1
      continue
    }
    total += 1
    const value = getField(data, field.key)
    if (field.kind === 'link') {
      const link = (value as { label?: string; url?: string } | undefined) ?? {}
      if (link.label?.trim() || link.url?.trim()) filled += 1
    } else if (field.kind === 'media') {
      const media = (value as { url?: string } | undefined) ?? {}
      if (media.url?.trim()) filled += 1
    } else if (String(value ?? '').trim()) {
      filled += 1
    }
  }
  return { filled, total }
}

// The nav "Goes to" destinations: the top of the page, plus every other section this template
// actually renders, in page order — an anchor a section wrapper (PageCanvas/each rich template's
// own renderer) tags itself with via sectionAnchorId, so picking one here always resolves to a
// real place on the page.
function buildAnchorOptions(sections: TemplateSection[]): AnchorOption[] {
  const options: AnchorOption[] = [{ value: '#', label: 'Top of page' }]
  const seen = new Set(options.map((o) => o.value))
  // Mirrors packages/page-renderer's identical check (renderLandingPageSections.ts's
  // `formEmbeddedElsewhere`): when some other section already embeds the attached Form, this
  // template's 'form-embed' entry is editorial metadata only — the published page never gives it
  // an independent DOM id (see that file's sectionIdAttr), so offering it here would be a dead
  // '#form' link. The section that actually owns the form (studio-contact/webinar-widget/
  // split-capture) already produces its own correct anchor in this same loop.
  const formEmbeddedElsewhere = sections.some(
    (s) => s.type === 'studio-contact' || s.type === 'webinar-widget' || s.type === 'split-capture',
  )
  for (const section of sections) {
    if (section.type === 'nav') continue
    if (section.type === 'form-embed' && formEmbeddedElsewhere) continue
    const anchor = `#${sectionAnchorId(section)}`
    if (seen.has(anchor)) continue
    seen.add(anchor)
    const group = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    const label =
      ANCHOR_LABEL_OVERRIDES[section.type] ?? (group ? SLOT_GROUP_LABELS[group] : section.key)
    options.push({ value: anchor, label })
  }
  return options
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

function AnchorSelectField({
  label,
  ariaLabel,
  value,
  disabled,
  options,
  onChange,
}: {
  label: string
  ariaLabel?: string
  value: string
  disabled: boolean
  options: AnchorOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        aria-label={ariaLabel ?? label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-input-border bg-background px-3 py-1 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!options.some((opt) => opt.value === value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
  anchorOptions,
  onChange,
}: {
  spec: FieldSpec
  items: Record<string, unknown>[]
  disabled: boolean
  anchorOptions: AnchorOption[]
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
              {itemFields.map((field) =>
                field.kind === 'anchor' ? (
                  <AnchorSelectField
                    key={field.key}
                    label={field.label}
                    value={String(getField(item, field.key) ?? '')}
                    disabled={disabled}
                    options={anchorOptions}
                    onChange={(value) =>
                      onChange(
                        items.map((row, idx) => (idx === i ? { ...row, [field.key]: value } : row)),
                      )
                    }
                  />
                ) : (
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
                ),
              )}
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
            onChange([
              ...items,
              Object.fromEntries(
                itemFields.map((f) => [
                  f.key,
                  f.kind === 'anchor' ? (anchorOptions[0]?.value ?? '#') : '',
                ]),
              ),
            ])
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

type RowStatus = 'required' | 'visible' | 'hidden'

function StatusPill({ status }: { status: RowStatus }) {
  if (status === 'required')
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Required
      </span>
    )
  if (status === 'hidden')
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-warning">
        <EyeOff size={11} /> Hidden
      </span>
    )
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-success">
      Visible
    </span>
  )
}

function ContentRow({
  title,
  fieldSummary,
  status,
  collapsed,
  onToggle,
  controlsEnabled,
  onHideToggle,
  onDelete,
  children,
}: {
  title: string
  fieldSummary: string | null
  status: RowStatus
  collapsed: boolean
  onToggle: () => void
  controlsEnabled: boolean
  onHideToggle?: () => void
  onDelete?: () => void
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-input-border bg-card transition-opacity',
        status === 'hidden' && 'opacity-60',
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className="flex w-full cursor-pointer select-none items-center gap-2.5 px-3.5 py-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {title}
        </span>
        {fieldSummary ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {fieldSummary}
          </span>
        ) : null}
        <StatusPill status={status} />
        {controlsEnabled ? (
          <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={status === 'hidden' ? `Show ${title}` : `Hide ${title}`}
              title={
                status === 'hidden' ? 'Hidden on the page — click to show' : 'Hide this section'
              }
              onClick={onHideToggle}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {status === 'hidden' ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              type="button"
              aria-label={`Delete ${title}`}
              title="Delete this section"
              onClick={onDelete}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : null}
        {collapsed ? (
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        )}
      </div>
      {!collapsed ? (
        <div className="space-y-2.5 border-t border-input-border px-3.5 py-3.5">{children}</div>
      ) : null}
    </div>
  )
}

export function ContentView({
  content,
  sections,
  layoutConfig,
  formId,
  submitLabel,
  successMessage,
  onBrowserSettings,
  onSlot,
  onLayoutConfig,
  onSubmitLabel,
  onSuccessMessage,
  onDetachForm,
  onAddForm,
}: {
  content: PageContent
  sections: TemplateSection[]
  layoutConfig: LayoutConfig
  formId: string
  submitLabel: string
  successMessage: string
  onBrowserSettings: (next: PageBrowserSettings) => void
  onSlot: (slotGroup: SlotGroupKey, next: unknown) => void
  onLayoutConfig: (next: LayoutConfig) => void
  onSubmitLabel: (value: string) => void
  onSuccessMessage: (value: string) => void
  onDetachForm: () => void
  onAddForm: () => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const [formDeleteConfirmOpen, setFormDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    sectionKey: string
    group: SlotGroupKey
    label: string
  } | null>(null)

  const orderedSections = [...sections].sort((a, b) => a.order - b.order)
  const sectionByGroup = new Map<SlotGroupKey, TemplateSection>()
  for (const section of orderedSections) {
    const group = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    if (group && !sectionByGroup.has(group)) sectionByGroup.set(group, section)
  }
  const anchorOptions = buildAnchorOptions(orderedSections)

  function isSectionHidden(sectionKey: string) {
    return layoutConfig.sections?.[sectionKey]?.hidden ?? false
  }

  function isRowCollapsed(rowKey: string) {
    return collapsed[rowKey] ?? rowKey !== 'browser'
  }

  function setRowCollapsed(rowKey: string, next: boolean) {
    setCollapsed((c) => ({ ...c, [rowKey]: next }))
  }

  function setSectionHidden(sectionKey: string, hidden: boolean) {
    onLayoutConfig({
      ...layoutConfig,
      sections: {
        ...layoutConfig.sections,
        [sectionKey]: { ...layoutConfig.sections?.[sectionKey], hidden },
      },
    })
  }

  type Row = {
    section: TemplateSection
    group: SlotGroupKey
    fields: FieldSpec[]
    stats: { filled: number; total: number }
    hidden: boolean
    controlsEnabled: boolean
  }

  const rows: Row[] = []
  const addCandidates: { section: TemplateSection; group: SlotGroupKey }[] = []
  for (const section of orderedSections) {
    const group = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    if (!group) continue
    if (sectionByGroup.get(group) !== section) continue
    const fields = SLOT_GROUP_FIELDS[group]
    const data = (content[group] as Record<string, unknown> | undefined) ?? {}
    const stats = computeFieldStats(fields, data)
    const hidden = isSectionHidden(section.key)
    const controlsEnabled = Boolean(section.hideable)
    if (controlsEnabled && stats.filled === 0 && !hidden) {
      addCandidates.push({ section, group })
      continue
    }
    rows.push({ section, group, fields, stats, hidden, controlsEnabled })
  }

  // Form is a page-level attachment (the Business's Form entity, via formId) — it has no slot
  // group and never reads/writes `content[group]` (SECTION_TYPE_TO_SLOT_GROUP['form-embed'] is
  // `undefined` by design, see that constant's comment), so it can't flow through the generic
  // fields-form loop above. Every template's schema still declares exactly one 'form-embed'
  // section purely so this row's position/hideability comes from the same real, template-owned
  // `order`/`hideable` data every other row already reads — see each schema file's own 'form'
  // entry comment for whether it's an independent render node or nested inside another section.
  const formSection = orderedSections.find((section) => section.type === 'form-embed')
  const formHidden = isSectionHidden('form')
  const formFilled = (submitLabel.trim() ? 1 : 0) + (successMessage.trim() ? 1 : 0)
  const showFormRow = Boolean(formId)
  const formControlsEnabled = formSection?.hideable ?? true
  // Defensive fallback only — every current template declares a 'form-embed' entry, so this path
  // (no schema data to position against) shouldn't be reachable, but a stray attached formId on a
  // template that somehow lacks one still needs somewhere to render rather than vanishing.
  function findInsertIndex(order: number) {
    const idx = rows.findIndex((row) => row.section.order > order)
    return idx === -1 ? rows.length : idx
  }
  const formInsertIndex = formSection ? findInsertIndex(formSection.order) : rows.length

  const anyExpanded =
    !isRowCollapsed('browser') ||
    (showFormRow && !isRowCollapsed('form')) ||
    rows.some((row) => !isRowCollapsed(row.section.key))

  function toggleCollapseAll() {
    const next: Record<string, boolean> = { browser: anyExpanded, form: anyExpanded }
    for (const row of rows) next[row.section.key] = anyExpanded
    setCollapsed(next)
  }

  function addSection(section: TemplateSection, group: SlotGroupKey) {
    onSlot(group, defaultContentForGroup(group))
    if (isSectionHidden(section.key)) setSectionHidden(section.key, false)
    setRowCollapsed(section.key, false)
    setAddPickerOpen(false)
  }

  function requestDelete(row: Row) {
    if (row.stats.filled === 0) {
      performDelete(row.section.key, row.group)
      return
    }
    setDeleteTarget({
      sectionKey: row.section.key,
      group: row.group,
      label: SLOT_GROUP_LABELS[row.group],
    })
  }

  function performDelete(sectionKey: string, group: SlotGroupKey) {
    onSlot(group, {})
    setSectionHidden(sectionKey, false)
    setDeleteTarget(null)
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </p>
        <Button variant="ghost" size="sm" onClick={toggleCollapseAll}>
          {anyExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      <ContentRow
        title="Browser"
        fieldSummary={null}
        status="required"
        collapsed={isRowCollapsed('browser')}
        onToggle={() => setRowCollapsed('browser', !isRowCollapsed('browser'))}
        controlsEnabled={false}
      >
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Used in the browser tab and bookmarks for every layout.
        </p>
        <TextField
          label="Page title"
          value={content.browser?.title ?? ''}
          disabled={false}
          onChange={(title) => onBrowserSettings({ ...content.browser, title })}
        />
        <BrowserFaviconField
          favicon={content.browser?.favicon}
          onChange={(favicon) =>
            onBrowserSettings({ ...content.browser, favicon, faviconUrl: undefined })
          }
        />
      </ContentRow>

      {rows.slice(0, formInsertIndex).map(renderSectionRow)}

      {showFormRow ? (
        <ContentRow
          key="form"
          title="Form"
          fieldSummary={`${formFilled}/2`}
          status={formHidden ? 'hidden' : 'visible'}
          collapsed={isRowCollapsed('form')}
          onToggle={() => setRowCollapsed('form', !isRowCollapsed('form'))}
          controlsEnabled={formControlsEnabled}
          onHideToggle={() => setSectionHidden('form', !formHidden)}
          onDelete={() => setFormDeleteConfirmOpen(true)}
        >
          <p className="-mt-1 text-[11px] text-muted-foreground">
            Shown on the published page. Republish to update what visitors see.
          </p>
          <TextField
            label="Submit button label"
            value={submitLabel}
            disabled={false}
            onChange={onSubmitLabel}
          />
          <TextField
            label="Success message"
            value={successMessage}
            disabled={false}
            multiline
            onChange={onSuccessMessage}
          />
        </ContentRow>
      ) : null}

      {rows.slice(formInsertIndex).map(renderSectionRow)}

      {addCandidates.length > 0 || (formSection && !formId) ? (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => setAddPickerOpen(true)}
        >
          <Plus size={14} /> Add section
        </Button>
      ) : null}

      {addPickerOpen ? (
        <Modal title="Add section" onClose={() => setAddPickerOpen(false)} size="xl">
          <div className="space-y-1 px-4 pb-1">
            <p className="mb-2 text-xs text-muted-foreground">
              Sections this layout supports but you haven&apos;t added yet.
            </p>
            {addCandidates.map(({ section, group }) => (
              <button
                key={section.key}
                type="button"
                onClick={() => addSection(section, group)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {SLOT_GROUP_LABELS[group]}
                <Plus size={14} className="text-muted-foreground" />
              </button>
            ))}
            {formSection && !formId ? (
              <button
                type="button"
                onClick={() => {
                  setAddPickerOpen(false)
                  onAddForm()
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                Form
                <Plus size={14} className="text-muted-foreground" />
              </button>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {formDeleteConfirmOpen ? (
        <Modal title="Delete section" onClose={() => setFormDeleteConfirmOpen(false)}>
          <div className="space-y-3 px-4 pb-1">
            <p className="text-sm text-foreground">
              Form is attached to this page. Hide it instead to keep it — hidden sections stay off
              the page but keep everything you&apos;ve written. Deleting only detaches it from this
              page; the form itself isn&apos;t removed.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => {
                  setSectionHidden('form', true)
                  setFormDeleteConfirmOpen(false)
                }}
              >
                Hide section
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onDetachForm()
                  setFormDeleteConfirmOpen(false)
                }}
              >
                Delete permanently
              </Button>
              <Button variant="ghost" onClick={() => setFormDeleteConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete section" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-3 px-4 pb-1">
            <p className="text-sm text-foreground">
              {deleteTarget.label} contains your content. Hide it instead to keep it — hidden
              sections stay off the page but keep everything you&apos;ve written.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => {
                  setSectionHidden(deleteTarget.sectionKey, true)
                  setDeleteTarget(null)
                }}
              >
                Hide section
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => performDelete(deleteTarget.sectionKey, deleteTarget.group)}
              >
                Delete permanently
              </Button>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )

  function renderSectionRow(row: Row) {
    const { section, group, fields, stats, hidden, controlsEnabled } = row
    const groupContent = (content[group] as Record<string, unknown> | undefined) ?? {}
    const rowKey = section.key
    return (
      <ContentRow
        key={rowKey}
        title={SLOT_GROUP_LABELS[group]}
        fieldSummary={stats.total > 0 ? `${stats.filled}/${stats.total}` : null}
        status={hidden ? 'hidden' : 'visible'}
        collapsed={isRowCollapsed(rowKey)}
        onToggle={() => setRowCollapsed(rowKey, !isRowCollapsed(rowKey))}
        controlsEnabled={controlsEnabled}
        onHideToggle={() => setSectionHidden(rowKey, !hidden)}
        onDelete={() => requestDelete(row)}
      >
        {fields.map((field) => {
          const set = (patch: Record<string, unknown>) =>
            onSlot(group, { ...groupContent, ...patch })
          if (field.kind === 'list') {
            return (
              <ListField
                key={field.key}
                spec={field}
                items={(getField(groupContent, field.key) as Record<string, unknown>[]) ?? []}
                disabled={false}
                anchorOptions={anchorOptions}
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
                disabled={false}
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
                  (getField(groupContent, field.key) as { label?: string; url?: string }) ?? {}
                }
                disabled={false}
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
                disabled={false}
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
              disabled={false}
              multiline={field.kind === 'richtext'}
              onChange={(value) => set({ [field.key]: value })}
            />
          )
        })}
      </ContentRow>
    )
  }
}
