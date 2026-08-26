export type SectionContent = Record<string, any> & { hidden?: boolean }
export type TemplateSection = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}
export type FeatureItem = { title: string; body: string }
