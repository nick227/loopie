import { useEffect } from 'react'
import { CanvasSection, HeroBlock, MediaImageBlock } from './CanvasSection'
import { CanvasAdBand } from './CanvasAdBand'
import { LAYOUT_VARIANT_CSS, GRID_TOKENS_CSS } from '@project/page-layout'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type { AdSlotDraft } from './adSlots'
import type { LayoutVariant } from './LayoutVariantPicker'
import {
  SECTION_TYPE_TO_SLOT_GROUP,
  sectionAnchorId,
  type LayoutConfig,
  type PageContent,
  type TemplateSection,
} from './types'

// Layout (2026-09-11) — variants that pair the hero with an adjacent media section into one
// two-column composition, rather than each rendering as its own full-width stacked block. Kept
// as a list (not a single `=== 'SPLIT'` check) since the server renderer's own equivalent grouping
// (composition/composePage.ts's composeDefault) reads from this exact same concept — see that
// file's own doc comment for why the two must stay in sync.
const HERO_MEDIA_GROUPING_VARIANTS: LayoutVariant[] = ['SPLIT']

export function PageCanvas({
  sections,
  content,
  layoutConfig,
  layoutVariant,
  theme,
  slots,
  hasForm,
  formFields,
  submitLabel,
  onSlot,
  onFormFields,
  onSlots,
}: {
  sections: TemplateSection[]
  content: PageContent
  layoutConfig: LayoutConfig
  layoutVariant: LayoutVariant
  theme: Record<string, string>
  slots: AdSlotDraft[]
  hasForm: boolean
  formFields: FormFieldDraft[]
  submitLabel: string
  onSlot: (slotGroup: keyof PageContent, next: unknown) => void
  onFormFields: (fields: FormFieldDraft[]) => void
  onSlots: (slots: AdSlotDraft[]) => void
}) {
  const backgroundColor = theme.backgroundColor ?? '#FFFFFF'
  const fontFamily = theme.fontFamily ?? '"DM Sans", ui-sans-serif, system-ui, sans-serif'
  const headingFont = theme.headingFont ?? 'Syne, ui-sans-serif, system-ui, sans-serif'
  const primaryColor = theme.primaryColor ?? '#FF2D6A'
  const onPrimaryColor = theme.onPrimaryColor ?? '#FFFFFF'
  const inkColor = theme.inkColor ?? '#0A0A0A'
  const cardColor = theme.cardColor ?? '#F5F5F5'
  const googleFonts =
    theme.googleFonts ?? 'family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800'
  const radius = theme.radius ?? '9999px'
  const hasBottom = slots.some((slot) => slot.placement === 'BOTTOM')

  useEffect(() => {
    if (!googleFonts) return
    const url = `https://fonts.googleapis.com/css2?${googleFonts}&display=swap`
    let link = document.querySelector(`link[href="${url}"]`) as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      document.head.appendChild(link)
    }
  }, [googleFonts])

  const visibleSections = sections.filter(
    (section) => !layoutConfig.sections?.[section.key]?.hidden,
  )
  const groupHeroMedia = HERO_MEDIA_GROUPING_VARIANTS.includes(layoutVariant)

  const items: { key: string; node: React.ReactNode }[] = []
  for (let i = 0; i < visibleSections.length; i++) {
    const section = visibleSections[i]!
    const nextSection = visibleSections[i + 1]
    const slotGroup = SECTION_TYPE_TO_SLOT_GROUP[section.type]
    const slotContent = slotGroup ? ((content as Record<string, unknown>)[slotGroup] ?? {}) : {}

    if (section.type === 'hero' && groupHeroMedia && nextSection?.type === 'media-image') {
      const mediaSlotGroup = SECTION_TYPE_TO_SLOT_GROUP[nextSection.type]
      const mediaContent = mediaSlotGroup
        ? ((content as Record<string, unknown>)[mediaSlotGroup] ?? {})
        : {}
      items.push({
        key: section.key,
        node: (
          <div
            id={sectionAnchorId(section)}
            className="lp-hero mx-auto max-w-[1040px] px-6 pb-4 pt-14 sm:pt-16"
          >
            <div className="lp-hero-copy">
              <HeroBlock
                section={section}
                content={slotContent as never}
                onChange={(next) => slotGroup && onSlot(slotGroup, next)}
                hasForm={hasForm}
                formFields={formFields}
                onFormFields={onFormFields}
                submitLabel={submitLabel}
                set={(patch) => slotGroup && onSlot(slotGroup, { ...slotContent, ...patch })}
                bare
              />
            </div>
            <div id={sectionAnchorId(nextSection)} className="lp-hero-media">
              <MediaImageBlock
                section={nextSection}
                content={mediaContent as never}
                onChange={(next) => mediaSlotGroup && onSlot(mediaSlotGroup, next)}
                hasForm={hasForm}
                formFields={formFields}
                onFormFields={onFormFields}
                submitLabel={submitLabel}
                set={(patch) =>
                  mediaSlotGroup && onSlot(mediaSlotGroup, { ...mediaContent, ...patch })
                }
                bare
              />
            </div>
          </div>
        ),
      })
      i++ // consume the paired media section too
      continue
    }

    items.push({
      key: section.key,
      node: (
        <div id={sectionAnchorId(section)}>
          {section.type === 'form-embed' ? (
            <CanvasAdBand placement="BEFORE_FORM" slots={slots} onChange={onSlots} />
          ) : null}
          <CanvasSection
            section={section}
            content={slotContent as never}
            onChange={(next) => slotGroup && onSlot(slotGroup, next)}
            hasForm={hasForm}
            formFields={formFields}
            onFormFields={onFormFields}
            submitLabel={submitLabel}
          />
          {section.type === 'hero' ? (
            <CanvasAdBand placement="AFTER_HERO" slots={slots} onChange={onSlots} />
          ) : null}
          {section.type === 'split-capture' ||
          (section.type === 'form-embed' &&
            slots.some((slot) => slot.placement === 'AFTER_FORM')) ? (
            <CanvasAdBand placement="AFTER_FORM" slots={slots} onChange={onSlots} />
          ) : null}
        </div>
      ),
    })
  }

  return (
    <div
      data-lp-layout={layoutVariant.toLowerCase()}
      className="lp-canvas overflow-hidden rounded-xl border border-input-border shadow-sm"
      style={{
        backgroundColor,
        fontFamily,
        color: inkColor,
        ['--lp-primary' as string]: primaryColor,
        ['--lp-on-primary' as string]: onPrimaryColor,
        ['--lp-bg' as string]: backgroundColor,
        ['--lp-heading' as string]: headingFont,
        ['--lp-ink' as string]: inkColor,
        ['--lp-card' as string]: cardColor,
        ['--lp-radius' as string]: radius,
        ['--lp-radius-lg' as string]: `min(${radius}, 28px)`,
      }}
    >
      <style>{GRID_TOKENS_CSS}</style>
      <style>{LAYOUT_VARIANT_CSS}</style>
      {items.map((item) => (
        <div key={item.key}>{item.node}</div>
      ))}
      {hasBottom ? <CanvasAdBand placement="BOTTOM" slots={slots} onChange={onSlots} /> : null}
    </div>
  )
}
