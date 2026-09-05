// Web development, get more customers (docs/.../03-poc-implementation-plan.md section 7 + POC
// path B — proves the taxonomy/playbook system is data-driven, not roofing-specific). Matched by
// exact ventureType (highest specificity in playbooks/index.ts's selection) since "web
// development" warrants its own qualification questions and delivery-process content even though
// it shares some Foundation/Sales steps with the shared local-service playbook.
import type { Playbook } from './index'

export const webDevelopmentGetCustomers: Playbook = {
  key: 'WEB_DEVELOPMENT_GET_CUSTOMERS',
  goals: ['GET_MORE_CUSTOMERS'],
  ventureTypes: ['WEB_DEVELOPMENT'],
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
      key: 'primary_offer',
      heading: 'What you build most',
      choices: [
        { value: 'MARKETING_SITES', label: 'Marketing sites' },
        { value: 'WEB_APPS', label: 'Web apps' },
        { value: 'ECOMMERCE', label: 'E-commerce' },
        { value: 'ONGOING_DEV', label: 'Ongoing dev work' },
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
        { templateId: 'system-idea-define-primary-offer', horizon: 'TODAY' },
        {
          templateId: 'system-idea-publish-homepage',
          horizon: 'TODAY',
          title: 'Launch your portfolio homepage',
        },
        { templateId: 'system-idea-first-audience', horizon: 'THIS_WEEK' },
        {
          templateId: 'system-idea-assign-team-owner',
          horizon: 'THIS_WEEK',
          title: 'Assign one person as your client point of contact',
          requiresTeamSize: ['SMALL_TEAM', 'ESTABLISHED_TEAM'],
        },
      ],
    },
    {
      key: 'LEAD_AND_SALES_PROCESS',
      label: 'Sales Process',
      steps: [
        { templateId: 'system-idea-discovery-call-checklist', horizon: 'THIS_WEEK' },
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
      key: 'FULFILLMENT_AND_OPERATIONS',
      label: 'Operations',
      steps: [
        { templateId: 'system-idea-revision-limit', horizon: 'TODAY' },
        { templateId: 'system-idea-project-handoff-checklist', horizon: 'THIS_WEEK' },
        { templateId: 'system-idea-standard-timeline-by-package', horizon: 'THIS_WEEK' },
      ],
    },
    {
      key: 'TEAM_AND_DELEGATION',
      label: 'Team',
      steps: [
        {
          templateId: 'system-idea-first-hire-scope',
          horizon: 'THIS_WEEK',
          title: 'Decide what your first subcontractor would take off your plate',
          requiresTeamSize: ['SOLO'],
        },
        {
          templateId: 'system-idea-document-team-process',
          horizon: 'THIS_WEEK',
          title: 'Document your project handoff process for the team',
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
        { templateId: 'system-idea-retainer-offer', horizon: 'THIS_WEEK' },
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
