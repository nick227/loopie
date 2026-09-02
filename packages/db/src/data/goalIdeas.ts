// Calendar idea-template content — see schema.prisma's GoalIdeaTemplate doc comment. Plain
// content, not UI: the frontend never hard-codes a suggestion string, it only ever renders
// whatever CalendarService resolves from these rows (system templates) or a business's own
// GoalIdeaTemplate rows (user-typed ideas). Same "content model separate from rendering" split as
// packages/db/src/systemTemplates.ts's landing-page templates.
//
// Two kinds live here:
//   - STATIC_GOAL_IDEA_TEMPLATES: always offered (subject to businessTypes targeting and the
//     per-business dismiss/accept memory in GoalIdeaState) — no live condition to evaluate.
//   - DYNAMIC_GOAL_IDEA_TEMPLATES: same shape, plus a `metricKey` CalendarService's fixed switch
//     evaluates against real product state (no published page, stale qualified leads, no recent
//     River activity, a still-draft ad) to decide whether to surface it at all right now.
export type GoalIdeaTemplateSeed = {
  id: string
  title: string
  ideaType:
    'ACTION' | 'OUTCOME' | 'MAINTENANCE' | 'CREATION' | 'RELATIONSHIP' | 'EXPERIMENT' | 'REVIEW'
  subjectType: 'GENERAL' | 'CRM' | 'ADVERTISEMENT' | 'PAGE' | 'RIVER' | 'BUSINESS'
  businessTypes: string[] | null
  defaultHorizon: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'
  defaultEstimateMinutes: number | null
  trackingType: 'MANUAL' | 'ENTITY_STATE' | 'COUNT'
  metricKey: string | null
  targetValue: number | null
  priorityWeight: number
}

export const STATIC_GOAL_IDEA_TEMPLATES: GoalIdeaTemplateSeed[] = [
  {
    id: 'system-idea-get-10-qualified-leads',
    title: 'Get 10 qualified leads',
    ideaType: 'OUTCOME',
    subjectType: 'CRM',
    businessTypes: null,
    defaultHorizon: 'NEXT_WEEK',
    defaultEstimateMinutes: null,
    trackingType: 'COUNT',
    metricKey: 'QUALIFIED_LEADS_TOTAL',
    targetValue: 10,
    priorityWeight: 10,
  },
  {
    id: 'system-idea-ask-for-reviews',
    title: 'Ask 3 customers for reviews',
    ideaType: 'RELATIONSHIP',
    subjectType: 'GENERAL',
    businessTypes: null,
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 20,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 5,
  },
  {
    id: 'system-idea-seasonal-offer',
    title: 'Create a seasonal offer',
    ideaType: 'CREATION',
    subjectType: 'ADVERTISEMENT',
    businessTypes: null,
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 60,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 4,
  },
  {
    id: 'system-idea-publish-recent-work',
    title: 'Publish recent work',
    ideaType: 'CREATION',
    subjectType: 'RIVER',
    businessTypes: null,
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 20,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 3,
  },
  {
    id: 'system-idea-logo-hour',
    title: 'Work on your logo for an hour',
    ideaType: 'CREATION',
    subjectType: 'BUSINESS',
    businessTypes: null,
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 60,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 1,
  },
  // Business-type packs — targeted via loose keyword match against Business.industry (see
  // CalendarService.matchesBusinessType). Same static/always-eligible shape as the universal
  // templates above, just gated to an audience.
  {
    id: 'system-idea-auto-before-after',
    title: 'Post before-and-after photos from a recent job',
    ideaType: 'CREATION',
    subjectType: 'RIVER',
    businessTypes: ['auto', 'detail', 'car', 'mobile', 'wash'],
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 20,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 4,
  },
  {
    id: 'system-idea-food-specials',
    title: "Share this week's specials",
    ideaType: 'CREATION',
    subjectType: 'RIVER',
    businessTypes: ['bakery', 'cafe', 'restaurant', 'food', 'coffee', 'bake'],
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 15,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 4,
  },
]

// Condition evaluated by CalendarService — see its resolveDynamicIdeas. targetValue here is a
// fallback only; count-driven ones (metricKey ending in _TOTAL/_SINCE) compute their own live
// targetValue and substitute it into the title at generation time.
export const DYNAMIC_GOAL_IDEA_TEMPLATES: GoalIdeaTemplateSeed[] = [
  {
    id: 'system-idea-publish-homepage',
    title: 'Publish your homepage',
    ideaType: 'MAINTENANCE',
    subjectType: 'PAGE',
    businessTypes: null,
    defaultHorizon: 'TODAY',
    defaultEstimateMinutes: 60,
    trackingType: 'ENTITY_STATE',
    metricKey: 'ANY_PAGE_PUBLISHED',
    targetValue: 1,
    priorityWeight: 20,
  },
  {
    id: 'system-idea-follow-up-qualified-leads',
    title: 'Follow up with {n} qualified leads',
    ideaType: 'ACTION',
    subjectType: 'CRM',
    businessTypes: null,
    defaultHorizon: 'TODAY',
    defaultEstimateMinutes: 30,
    trackingType: 'COUNT',
    metricKey: 'QUALIFIED_LEAD_FOLLOWUPS_SINCE',
    targetValue: null,
    priorityWeight: 15,
  },
  {
    id: 'system-idea-finish-ad-draft',
    title: 'Finish and publish your advertisement',
    ideaType: 'MAINTENANCE',
    subjectType: 'ADVERTISEMENT',
    businessTypes: null,
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 30,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 8,
  },
  {
    id: 'system-idea-share-update',
    title: 'Share an update',
    ideaType: 'MAINTENANCE',
    subjectType: 'RIVER',
    businessTypes: null,
    defaultHorizon: 'THIS_WEEK',
    defaultEstimateMinutes: 15,
    trackingType: 'MANUAL',
    metricKey: null,
    targetValue: null,
    priorityWeight: 2,
  },
]
