// Local service, get more customers (docs/.../03-poc-implementation-plan.md section 7 + POC path
// A, Roofing). Applicable to any LOCAL venture via the `traits` match — Plumbing/HVAC/Painting/
// Handyman/Lawn mowing/etc. all get this same playbook, not a roofing-specific copy, demonstrating
// the trait-based reuse the docs call for.
import type { Playbook } from './index'

export const localServiceGetCustomers: Playbook = {
  key: 'LOCAL_SERVICE_GET_CUSTOMERS',
  goals: ['GET_MORE_CUSTOMERS'],
  traits: ['LOCAL'],
  requiredKnowledge: [
    'targetCustomer',
    'serviceArea',
    'customerGoalBand',
    'weeklyGrowthTimeBand',
    'marketingBudgetBand',
  ],
  qualificationQuestions: [
    {
      key: 'target_customer',
      heading: 'Who are you trying to reach?',
      choices: [
        { value: 'HOMEOWNERS', label: 'Homeowners' },
        { value: 'BUSINESSES', label: 'Businesses' },
        { value: 'BOTH', label: 'Both' },
      ],
      writesKnowledge: 'targetCustomer',
    },
    {
      key: 'service_area',
      heading: 'How far do you travel for work?',
      choices: [
        { value: 'ONE_CITY', label: 'Just my city' },
        { value: 'METRO_AREA', label: 'My metro area' },
        { value: 'MULTIPLE_REGIONS', label: 'Multiple regions' },
      ],
      writesKnowledge: 'serviceArea',
    },
    {
      key: 'customer_goal',
      heading: 'New customers each month',
      choices: [
        { value: 'ONE_TO_THREE', label: '1–3' },
        { value: 'FOUR_TO_TEN', label: '4–10' },
        { value: 'TEN_PLUS', label: '10+' },
      ],
      writesKnowledge: 'customerGoalBand',
    },
    {
      key: 'weekly_time',
      heading: 'Time each week',
      choices: [
        { value: 'UNDER_TWO', label: 'Under 2 hours' },
        { value: 'TWO_TO_FIVE', label: '2–5 hours' },
        { value: 'FIVE_PLUS', label: '5+ hours' },
      ],
      writesKnowledge: 'weeklyGrowthTimeBand',
    },
    {
      key: 'marketing_budget',
      heading: 'Monthly marketing budget',
      choices: [
        { value: 'NONE', label: '$0' },
        { value: 'UNDER_100', label: 'Under $100' },
        { value: 'ONE_TO_FIVE_HUNDRED', label: '$100–500' },
        { value: 'FIVE_HUNDRED_PLUS', label: '$500+' },
      ],
      writesKnowledge: 'marketingBudgetBand',
    },
  ],
  steps: [
    // DEFINE_PRIMARY_OFFER — no existing template covers "what do you actually sell," so this is
    // one of the two genuinely new templates (see packages/db/src/data/goalIdeas.ts).
    { templateId: 'system-idea-define-primary-offer', horizon: 'TODAY' },
    // VERIFY_OR_PUBLISH_HOMEPAGE — reuses the existing Foundation idea as-is.
    { templateId: 'system-idea-publish-homepage', horizon: 'TODAY' },
    // BUILD_PROSPECT_LIST — reuses the existing "create your first audience" idea as-is.
    { templateId: 'system-idea-first-audience', horizon: 'THIS_WEEK' },
    // CONTACT_PROSPECTS — the other genuinely new template; its count comes from customerGoalBand
    // (see AssistantGoalCycleService.buildPlan's band->count map), not a live metric.
    {
      templateId: 'system-idea-contact-prospects',
      horizon: 'THIS_WEEK',
      quantityFrom: 'customerGoalBand',
    },
    // FOLLOW_UP_INTERESTED_LEADS — reuses the existing dynamic "flagged leads" idea as a plain
    // MANUAL reminder for Day 0 of the plan (no interested leads exist yet); the same template still
    // surfaces normally in the Ideas feed once real leads are flagged, unaffected by this override.
    {
      templateId: 'system-idea-leads-flagged-for-follow-up',
      horizon: 'NEXT_WEEK',
      title: 'Follow up with interested leads',
      trackingTypeOverride: 'MANUAL',
    },
    // ASK_FOR_REVIEWS_OR_REFERRALS — reuses the existing repeatable idea as-is.
    { templateId: 'system-idea-ask-for-reviews', horizon: 'NEXT_WEEK' },
  ],
  reviewTrigger: { minDaysElapsed: 14, minStepsDoneFraction: 0.5 },
}
