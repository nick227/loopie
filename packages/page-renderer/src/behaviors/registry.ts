import { COUNTDOWN_SCRIPT } from './countdown'
import { GALLERY_LIGHTBOX_SCRIPT } from './gallery'
import { SERVICE_TABS_SCRIPT } from './serviceTabs'
import { CAROUSEL_SCRIPT } from './carousel'

// Always emitted, on every page, regardless of Starter — every one of these is a real no-op when
// its matching markup is absent. Order matches the pre-extraction output exactly (webinar
// countdown, gallery lightbox, service tabs, testimonial carousel), since `document.ts` appends a
// Starter's own extra `behaviors` (e.g. scroll effects) immediately after this list.
export const BASELINE_BEHAVIOR_SCRIPTS: string[] = [
  COUNTDOWN_SCRIPT,
  GALLERY_LIGHTBOX_SCRIPT,
  SERVICE_TABS_SCRIPT,
  CAROUSEL_SCRIPT,
]
