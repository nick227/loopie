// Local service, get more customers (docs/.../03-poc-implementation-plan.md section 7 + POC path
// A, Roofing). Applicable to any LOCAL venture via the `traits` match — Plumbing/HVAC/Painting/
// Handyman/Lawn mowing/Pressure washing/Landscaping all get this same playbook, not a
// trade-specific copy, demonstrating the trait-based reuse the docs call for. Occupation-specific
// substance (equipment maintenance, route planning) is gated by the EQUIPMENT_HEAVY trait within
// Fulfillment & Operations rather than shown to every LOCAL trade regardless of relevance.
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
      heading: "Who you're trying to reach",
      choices: [
        { value: 'HOMEOWNERS', label: 'Homeowners' },
        { value: 'BUSINESSES', label: 'Businesses' },
        { value: 'BOTH', label: 'Both' },
      ],
      writesKnowledge: 'targetCustomer',
    },
    {
      key: 'service_area',
      heading: 'How far you travel for work',
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
  layers: [
    {
      key: 'OFFER_AND_FOUNDATION',
      label: 'Marketing Foundation',
      steps: [
        { templateId: 'system-idea-define-primary-offer', horizon: 'TODAY' },
        { templateId: 'system-idea-publish-homepage', horizon: 'TODAY' },
        { templateId: 'system-idea-first-audience', horizon: 'THIS_WEEK' },
        {
          templateId: 'system-idea-assign-team-owner',
          horizon: 'THIS_WEEK',
          title: 'Name one person as your booking contact',
          requiresTeamSize: ['SMALL_TEAM', 'ESTABLISHED_TEAM'],
        },
      ],
    },
    {
      key: 'LEAD_AND_SALES_PROCESS',
      label: 'Sales Process',
      steps: [
        { templateId: 'system-idea-callback-window', horizon: 'TODAY' },
        { templateId: 'system-idea-quoting-script', horizon: 'THIS_WEEK' },
        {
          templateId: 'system-idea-contact-prospects',
          horizon: 'THIS_WEEK',
          quantityFrom: 'customerGoalBand',
        },
        {
          templateId: 'system-idea-leads-flagged-for-follow-up',
          horizon: 'NEXT_WEEK',
          title: 'Follow up with interested leads',
          trackingTypeOverride: 'MANUAL',
        },
      ],
    },
    {
      key: 'FULFILLMENT_AND_OPERATIONS',
      label: 'Operations',
      steps: [
        {
          templateId: 'system-idea-equipment-maintenance-log',
          horizon: 'THIS_WEEK',
          requiresTrait: 'EQUIPMENT_HEAVY',
        },
        {
          templateId: 'system-idea-route-planning',
          horizon: 'THIS_WEEK',
          requiresTrait: 'EQUIPMENT_HEAVY',
        },
        { templateId: 'system-idea-job-checklist', horizon: 'THIS_WEEK' },
        { templateId: 'system-idea-ask-for-reviews', horizon: 'NEXT_WEEK' },
      ],
    },
    {
      key: 'TEAM_AND_DELEGATION',
      label: 'Team',
      steps: [
        {
          templateId: 'system-idea-first-hire-scope',
          horizon: 'THIS_WEEK',
          requiresTeamSize: ['SOLO'],
        },
        {
          templateId: 'system-idea-document-team-process',
          horizon: 'THIS_WEEK',
          title: 'Write down your intake process for the team',
          requiresTeamSize: ['SMALL_TEAM', 'ESTABLISHED_TEAM'],
        },
        {
          templateId: 'system-idea-weekly-team-checkin',
          horizon: 'THIS_WEEK',
          requiresTeamSize: ['SMALL_TEAM', 'ESTABLISHED_TEAM'],
        },
      ],
    },
    {
      key: 'SCALE_AND_SYSTEMS',
      label: 'Scale',
      repeatableOnceReached: true,
      steps: [
        { templateId: 'system-idea-seasonal-maintenance-program', horizon: 'THIS_WEEK' },
        { templateId: 'system-idea-referral-incentive', horizon: 'NEXT_WEEK' },
        {
          templateId: 'system-idea-monthly-review',
          horizon: 'NEXT_WEEK',
          title: 'Review your close rate and average job size monthly',
        },
      ],
    },
  ],
  reviewTrigger: { minDaysElapsed: 14, minStepsDoneFraction: 0.5 },
}
