import { renderLogoCloudMarquee } from '../../sections/logos'
import type { StarterDefinition } from '../../core/types'
import { STORE_STYLES_CSS } from './styles'

export const storeDefinition: StarterDefinition = {
  id: 'store',
  styles: STORE_STYLES_CSS,
  sectionOverrides: {
    // Shared with Studio's own override — see sections/logos.ts's doc comment.
    'logo-cloud': renderLogoCloudMarquee,
  },
}
