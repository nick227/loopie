import { composeDefault } from '../../composition/composePage'
import type { ComposeInput } from '../../core/types'

// Email Outreach is otherwise the shared default per-section composition, plus this one closing
// strip appended at the very end of the body.
const EMAIL_FOOT_HTML =
  '<p class="lp-email-foot">Sent with care · Reply only if useful · Same-day response on business days</p>'

export function composeEmailOutreach(input: ComposeInput): string {
  return `${composeDefault(input)}\n${EMAIL_FOOT_HTML}`
}
