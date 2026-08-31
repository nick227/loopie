/**
 * Base Types (Atoms)
 */

export interface ImageProps {
  url: string
  alt: string
  width?: number
  height?: number
  caption?: string
}

export interface ButtonProps {
  label: string
  url: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  icon?: string // e.g., 'ArrowRight', 'Play'
}

export interface LinkProps {
  label: string
  url: string
}

export interface SeoProps {
  title: string
  description: string
  ogImage?: ImageProps
}

export interface ThemeConfig {
  primaryColor?: string
  fontFamily?: 'sans' | 'serif' | 'mono'
  mode?: 'light' | 'dark' | 'system'
}

/**
 * Block Types
 */

export interface HeroBlock {
  _type: 'hero'
  headline: string
  subheadline: string
  ctas?: ButtonProps[]
  media?: ImageProps // Hero image
  badges?: string[] // e.g., "Invite-only Beta"

  // NEW: Support for Hero interaction patterns
  interactionType?:
    'static' | 'carousel' | 'service-selector' | 'before-after' | 'video-chapters' | 'inline-form'

  // NEW: Support for multi-state heroes (e.g., carousel or tabs)
  states?: {
    label?: string // For tabs/selectors
    headline: string
    subheadline?: string
    media: ImageProps
    ctas?: ButtonProps[]
  }[]

  // NEW: Proof strip built into the hero
  proof?: {
    rating?: number
    text: string
    images?: string[] // Client avatars/logos
  }

  variant?: 'split' | 'centered' | 'background-image'
}

export interface FeatureGridBlock {
  _type: 'feature_grid'
  title?: string
  subtitle?: string
  features: {
    title: string
    description: string
    icon?: string
  }[]
  columns?: 2 | 3 | 4
}

export interface TextMediaBlock {
  _type: 'text_media'
  headline: string
  body: string
  media: ImageProps
  ctas?: ButtonProps[]
  layout: 'media-left' | 'media-right'
}

export interface LogoCloudBlock {
  _type: 'logo_cloud'
  title?: string
  logos: {
    name: string
    icon?: string
    imageUrl?: string
  }[]
}

export interface MetricsBlock {
  _type: 'metrics'
  metrics: {
    value: string
    label: string
    description?: string
  }[]
}

export interface TestimonialBlock {
  _type: 'testimonials'
  title?: string
  layout?: 'grid' | 'slider' | 'marquee'
  testimonials: {
    quote: string
    author: string
    role?: string
    avatarUrl?: string
    metrics?: string // e.g., "$10k/mo"
  }[]
}

export interface FaqBlock {
  _type: 'faq'
  title?: string
  layout?: 'accordion' | 'grid'
  questions: {
    question: string
    answer: string
  }[]
}

export interface FormBlock {
  _type: 'form'
  title: string
  subtitle?: string
  formType: 'waitlist' | 'contact' | 'registration' | 'newsletter'
  layout?: 'inline' | 'card' | 'split'
  buttonLabel: string
  successMessage?: string
}

export interface ImageBrowserBlock {
  _type: 'image_browser'
  title?: string
  subtitle?: string
  layout: 'carousel' | 'masonry' | 'thumbnail-rail' | 'cinematic'
  images: {
    url: string
    alt: string
    caption?: string
  }[]
}

export interface BeforeAfterBlock {
  _type: 'before_after'
  title?: string
  subtitle?: string
  beforeImage: ImageProps
  afterImage: ImageProps
  beforeLabel?: string
  afterLabel?: string
}

export interface ServiceSelectorBlock {
  _type: 'service_selector'
  title?: string
  subtitle?: string
  services: {
    id: string
    label: string
    headline: string
    description: string
    price?: string
    icon?: string
    media?: ImageProps
    cta?: ButtonProps
  }[]
}
export interface PricingBlock {
  _type: 'pricing'
  title?: string
  subtitle?: string
  billingToggle?: { monthly: string; yearly: string; discount?: string }
  plans: {
    id: string
    name: string
    description: string
    price: { monthly: string; yearly?: string }
    features: string[]
    isPopular?: boolean
    cta: ButtonProps
  }[]
}

export interface TimelineBlock {
  _type: 'timeline'
  title?: string
  subtitle?: string
  steps: {
    title: string
    description: string
    date?: string
    status?: 'completed' | 'current' | 'upcoming'
  }[]
}

export interface StickyMediaBlock {
  _type: 'sticky_media'
  sections: {
    id: string
    headline: string
    body: string
    media: ImageProps
  }[]
}

export interface ProductBrowserBlock {
  _type: 'product_browser'
  title?: string
  products: {
    id: string
    name: string
    description: string
    price?: string
    media: ImageProps
    cta?: ButtonProps
  }[]
}

export interface HotspotViewerBlock {
  _type: 'hotspot_viewer'
  title?: string
  subtitle?: string
  baseImage: ImageProps
  hotspots: {
    id: string
    x: number
    y: number
    label: string
    description: string
  }[]
}

export interface VideoChapterBlock {
  _type: 'video_chapter'
  title?: string
  videoUrl: string
  chapters: {
    title: string
    timestamp: string
  }[]
}

export interface MarqueeBlock {
  _type: 'marquee'
  direction?: 'left' | 'right'
  speed?: 'slow' | 'normal' | 'fast'
  items: {
    text?: string
    logo?: ImageProps
  }[]
}

export interface ComparisonBlock {
  _type: 'comparison'
  title?: string
  items: {
    feature: string
    us: string | boolean
    them: string | boolean
  }[]
}

export interface BookingPickerBlock {
  _type: 'booking_picker'
  title?: string
  subtitle?: string
  options: {
    label: string
    value: string
  }[]
}

export interface CaseStudyBrowserBlock {
  _type: 'case_study_browser'
  title?: string
  caseStudies: {
    id: string
    client: string
    logo?: ImageProps
    headline: string
    results: { label: string; value: string }[]
    media: ImageProps
  }[]
}

export interface FloatingDockBlock {
  _type: 'floating_dock'
  items: {
    label: string
    icon: string
    url: string
  }[]
}

export interface CalculatorBlock {
  _type: 'calculator'
  title?: string
  subtitle?: string
  inputs: {
    id: string
    label: string
    type: 'slider' | 'number'
    min?: number
    max?: number
    step?: number
    defaultValue: number
  }[]
}

// Union of all possible block types
export type PageBlock =
  | HeroBlock
  | FeatureGridBlock
  | TextMediaBlock
  | LogoCloudBlock
  | MetricsBlock
  | TestimonialBlock
  | FaqBlock
  | FormBlock
  | ImageBrowserBlock
  | BeforeAfterBlock
  | ServiceSelectorBlock
  | PricingBlock
  | TimelineBlock
  | StickyMediaBlock
  | ProductBrowserBlock
  | HotspotViewerBlock
  | VideoChapterBlock
  | MarqueeBlock
  | ComparisonBlock
  | BookingPickerBlock
  | CaseStudyBrowserBlock
  | FloatingDockBlock
  | CalculatorBlock

/**
 * Page Schema Model
 */

export interface PageModel {
  title: string
  slug: string
  seo: SeoProps
  theme?: ThemeConfig
  navLinks: LinkProps[]
  blocks: PageBlock[]
}
