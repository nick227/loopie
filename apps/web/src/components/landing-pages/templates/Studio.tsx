import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type { PageContent } from '../../../pages/landing-pages/components/types'
import { ContactSection } from './studio/Contact'
import { FAQSection } from './studio/FAQ'
import { FeaturesSection } from './studio/Features'
import { GallerySection } from './studio/Gallery'
import { HeroSection } from './studio/Hero'
import { LogoCloudSection } from './studio/Logos'
import { MetricsSection } from './studio/Metrics'
import { NavBar } from './studio/NavBar'
import { ParallaxBridge } from './studio/ParallaxBridge'
import { ServicesSection } from './studio/Services'
import { TeamSection } from './studio/Team'
import { TestimonialsSection } from './studio/Testimonials'
import { TOKEN_DEFAULTS } from './studio/tokens'

export function Studio({
  content,
  theme,
  layoutConfig,
  editable = false,
  onSlotChange,
  hasForm,
  formFields,
  onFormFields,
  submitLabel,
}: {
  content?: PageContent
  theme?: Record<string, string>
  layoutConfig?: { sections?: Record<string, { hidden?: boolean }> }
  editable?: boolean
  onSlotChange?: (slotGroup: keyof PageContent, patch: unknown) => void
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
}) {
  const c = content ?? {}
  const t = theme ?? {}
  const isHidden = (sectionKey: string) => Boolean(layoutConfig?.sections?.[sectionKey]?.hidden)

  function slotChange<K extends keyof PageContent>(
    key: K,
    patch: Partial<NonNullable<PageContent[K]>>,
  ) {
    onSlotChange?.(key, { ...(c[key] as object | undefined), ...patch })
  }

  return (
    <div
      className={`min-h-screen antialiased ${editable ? '' : 'snap-y snap-mandatory'}`}
      style={{
        backgroundColor: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        color: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        fontFamily: t.fontFamily ?? TOKEN_DEFAULTS.fontFamily,
        ['--lp-primary' as string]: t.primaryColor ?? TOKEN_DEFAULTS.primaryColor,
        ['--lp-on-primary' as string]: t.onPrimaryColor ?? TOKEN_DEFAULTS.onPrimaryColor,
        ['--lp-bg' as string]: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        ['--lp-ink' as string]: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        ['--lp-card' as string]: t.cardColor ?? TOKEN_DEFAULTS.cardColor,
        ['--lp-heading' as string]: t.headingFont ?? TOKEN_DEFAULTS.headingFont,
        ['--lp-radius' as string]: t.radius ?? TOKEN_DEFAULTS.radius,
      }}
    >
      <style>{`
        @keyframes lp-studio-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lp-studio-marquee { animation: lp-studio-marquee 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lp-studio-marquee { animation: none; }
        }
      `}</style>
      <NavBar content={c.nav} editable={editable} onChange={(patch) => slotChange('nav', patch)} />

      {/*
        Frames 1–2 ride a sticky full-bleed parallax (hero media). It fades out as the
        track ends so frame 3 (services intro) lands as a clean solid page.
      */}
      <ParallaxBridge
        imageUrl={c.hero?.media?.url}
        imageAlt={c.hero?.media?.alt ?? ''}
        editable={editable}
        onImageUrl={(url) => slotChange('hero', { media: { ...(c.hero?.media ?? {}), url } })}
      >
        <HeroSection
          content={c.hero}
          editable={editable}
          onChange={(patch) => slotChange('hero', patch)}
        />
        {!isHidden('logos') && (
          <LogoCloudSection
            content={c.logos}
            editable={editable}
            onChange={(patch) => slotChange('logos', patch)}
          />
        )}
        {!isHidden('metrics') && (
          <MetricsSection
            content={c.metrics}
            editable={editable}
            onChange={(patch) => slotChange('metrics', patch)}
          />
        )}
      </ParallaxBridge>

      {!isHidden('services') && (
        <ServicesSection
          content={c.services}
          editable={editable}
          onChange={(patch) => slotChange('services', patch)}
        />
      )}
      {!isHidden('gallery') && (
        <GallerySection
          content={c.gallery}
          editable={editable}
          onChange={(patch) => slotChange('gallery', patch)}
        />
      )}
      {!isHidden('features') && (
        <FeaturesSection
          content={c.features}
          editable={editable}
          onChange={(patch) => slotChange('features', patch)}
        />
      )}
      {!isHidden('team') && (
        <TeamSection
          content={c.team}
          editable={editable}
          onChange={(patch) => slotChange('team', patch)}
        />
      )}
      {!isHidden('testimonials') && (
        <TestimonialsSection
          content={c.testimonials}
          editable={editable}
          onChange={(patch) => slotChange('testimonials', patch)}
        />
      )}
      {!isHidden('faq') && (
        <FAQSection
          content={c.faq}
          editable={editable}
          onChange={(patch) => slotChange('faq', patch)}
        />
      )}
      <ContactSection
        content={c.footer}
        editable={editable}
        onChange={(patch) => slotChange('footer', patch)}
        hasForm={hasForm}
        formFields={formFields}
        onFormFields={onFormFields}
        submitLabel={submitLabel}
      />
    </div>
  )
}
