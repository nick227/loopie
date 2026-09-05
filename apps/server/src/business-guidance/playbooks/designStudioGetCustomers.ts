// Design studio, get more customers (2026-09-04 operating-system pass — the explicit
// no-equipment contrast against localServiceGetCustomers' equipment-heavy trades: Design Studio's
// Operations layer is entirely client/creative-process, never equipment). Matched by exact
// ventureType, same precedent as webDevelopmentGetCustomers — before this playbook existed,
// DESIGN_STUDIO matched nothing (not LOCAL, not WEB_DEVELOPMENT), a real content gap.
import type { Playbook } from './index'

export const designStudioGetCustomers: Playbook = {
  key: 'DESIGN_STUDIO_GET_CUSTOMERS',
  goals: ['GET_MORE_CUSTOMERS'],
  ventureTypes: ['DESIGN_STUDIO'],
  requiredKnowledge: ['targetCustomer', 'primaryOffer', 'customerGoalBand', 'weeklyGrowthTimeBand'],
  qualificationQuestions: [
    {
      key: 'target_customer',
      heading: "Who you're trying to reach",
      choices: [
        { value: 'INDIVIDUALS', label: 'Individuals' },
        { value: 'SMALL_BUSINESSES', label: 'Small businesses' },
        { value: 'STARTUPS', label: 'Startups' },
        { value: 'ENTERPRISES', label: 'Enterprises' },
      ],
      writesKnowledge: 'targetCustomer',
    },
    {
      key: 'design_focus',
      heading: 'What you design most',
      choices: [
        { value: 'BRAND_IDENTITY', label: 'Brand identity' },
        { value: 'MARKETING_MATERIALS', label: 'Marketing materials' },
        { value: 'WEB_AND_APP', label: 'Web & app design' },
        { value: 'PACKAGING', label: 'Packaging' },
      ],
      writesKnowledge: 'primaryOffer',
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
  ],
  layers: [
    {
      key: 'OFFER_AND_FOUNDATION',
      label: 'Marketing Foundation',
      steps: [
        {
          templateId: 'system-idea-define-primary-offer',
          horizon: 'TODAY',
          title: 'Define your design package tiers',
        },
        {
          templateId: 'system-idea-publish-homepage',
          horizon: 'TODAY',
          title: 'Launch your portfolio homepage',
        },
        { templateId: 'system-idea-first-audience', horizon: 'THIS_WEEK' },
        {
          templateId: 'system-idea-assign-team-owner',
          horizon: 'THIS_WEEK',
          title: 'Assign one person as your client intake owner',
          requiresTeamSize: ['SMALL_TEAM', 'ESTABLISHED_TEAM'],
        },
      ],
    },
    {
      key: 'LEAD_AND_SALES_PROCESS',
      label: 'Sales Process',
      steps: [
        { templateId: 'system-idea-creative-brief-intake', horizon: 'THIS_WEEK' },
        { templateId: 'system-idea-proposal-turnaround', horizon: 'TODAY' },
        {
          templateId: 'system-idea-contact-prospects',
          horizon: 'THIS_WEEK',
          quantityFrom: 'customerGoalBand',
        },
        {
          templateId: 'system-idea-send-proposal-to-interested',
          horizon: 'NEXT_WEEK',
          title: 'Send a proposal when someone shows interest',
          trackingTypeOverride: 'MANUAL',
        },
      ],
    },
    {
      // The explicit contrast layer: no equipment, all client/creative process.
      key: 'FULFILLMENT_AND_OPERATIONS',
      label: 'Operations',
      steps: [
        {
          templateId: 'system-idea-revision-limit',
          horizon: 'TODAY',
          title: 'Set your revision-round limit per project',
        },
        { templateId: 'system-idea-client-feedback-process', horizon: 'THIS_WEEK' },
        { templateId: 'system-idea-portfolio-refresh-cadence', horizon: 'THIS_WEEK' },
      ],
    },
    {
      key: 'TEAM_AND_DELEGATION',
      label: 'Team',
      steps: [
        {
          templateId: 'system-idea-first-hire-scope',
          horizon: 'THIS_WEEK',
          title: 'Decide what your first hire would take off your plate',
          requiresTeamSize: ['SOLO'],
        },
        {
          templateId: 'system-idea-document-team-process',
          horizon: 'THIS_WEEK',
          title: 'Document your client-approval workflow for the team',
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
        {
          templateId: 'system-idea-retainer-offer',
          horizon: 'THIS_WEEK',
          title: 'Set up a retainer offer for repeat clients',
        },
        { templateId: 'system-idea-referral-incentive', horizon: 'NEXT_WEEK' },
        {
          templateId: 'system-idea-monthly-review',
          horizon: 'NEXT_WEEK',
          title: 'Review your project margin monthly',
        },
      ],
    },
  ],
  reviewTrigger: { minDaysElapsed: 14, minStepsDoneFraction: 0.5 },
}
