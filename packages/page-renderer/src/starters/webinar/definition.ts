import type { StarterDefinition } from '../../core/types'
import { WEBINAR_STYLES_CSS } from './styles'

// No section renders any differently for Webinar Signup — only its own skin CSS distinguishes it.
export const webinarDefinition: StarterDefinition = {
  id: 'webinar-signup',
  styles: WEBINAR_STYLES_CSS,
}
