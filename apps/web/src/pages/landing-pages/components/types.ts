export type FeatureItem = { title: string; body: string }
export type SectionContent = Record<string, string | boolean | FeatureItem[] | undefined> & {
  hidden?: boolean
  headline?: string
  subheadline?: string
  ctaLabel?: string
  ctaLink?: string
  items?: FeatureItem[]
  text?: string
  assetId?: string
  imageUrl?: string
  youtubeUrl?: string
}
export type TemplateSection = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}
