import type { StarterDefinition } from '../../core/types'

// The baseline Starter — every field is deliberately absent. No skin CSS (there never was a
// `.lp-template-standard` block), no composition override, no section overrides, no extra
// behaviors: a page with no `templateSchema.renderer` at all renders exactly like this.
export const standardDefinition: StarterDefinition = {
  id: 'standard',
}
