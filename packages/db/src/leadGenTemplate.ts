export const SYSTEM_LEAD_GEN_TEMPLATE_ID = 'system-template-lead-gen'

export const SYSTEM_LEAD_GEN_SCHEMA = {
  sections: [
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['headline', 'subheadline', 'ctaLabel', 'ctaLink'],
    },
    { key: 'features', type: 'feature-grid', order: 1, hideable: true, editable: ['items'] },
    { key: 'form', type: 'form-embed', order: 2, hideable: false, editable: [] },
    { key: 'footer', type: 'footer', order: 3, hideable: true, editable: ['text'] },
  ],
  themeTokens: ['primaryColor', 'backgroundColor', 'fontFamily'],
}
