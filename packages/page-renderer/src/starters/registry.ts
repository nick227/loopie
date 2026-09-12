import type { StarterDefinition, StarterRendererId } from '../core/types'
import { standardDefinition } from './standard/definition'
import { corporateDefinition } from './corporate/definition'
import { webinarDefinition } from './webinar/definition'
import { studioDefinition } from './studio/definition'
import { portfolioDefinition } from './portfolio/definition'
import { storeDefinition } from './store/definition'
import { emailOutreachDefinition } from './emailOutreach/definition'

// Fixed order matches the pre-extraction stylesheet's own order exactly (see
// core/document.ts's allStarterStylesCss) — every Starter's own skin CSS ships on every page
// unconditionally, regardless of which one is active; only the current `lp-template-{id}` body
// class ever matches any of it. Adding a new Starter means registering one more module here.
export const ALL_STARTER_DEFINITIONS: StarterDefinition[] = [
  standardDefinition,
  corporateDefinition,
  webinarDefinition,
  studioDefinition,
  portfolioDefinition,
  storeDefinition,
  emailOutreachDefinition,
]

const STARTER_BY_ID: Record<StarterRendererId, StarterDefinition> = Object.fromEntries(
  ALL_STARTER_DEFINITIONS.map((def) => [def.id, def]),
) as Record<StarterRendererId, StarterDefinition>

export function getStarterDefinition(id: StarterRendererId): StarterDefinition {
  return STARTER_BY_ID[id] ?? standardDefinition
}
