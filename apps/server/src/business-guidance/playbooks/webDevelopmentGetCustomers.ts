// Web development, get more customers (docs/.../03-poc-implementation-plan.md section 7 + POC
// path B — proves the taxonomy/playbook system is data-driven, not roofing-specific). Matched by
// exact ventureType (highest specificity in playbooks/index.ts's selection) since "web development"
// warrants its own qualification questions (project type) even though it shares three of six steps
// with localServiceGetCustomers verbatim.
import type { Playbook } from './index'

export const webDevelopmentGetCustomers: Playbook = {
  key: 'WEB_DEVELOPMENT_GET_CUSTOMERS',
  goals: ['GET_MORE_CUSTOMERS'],
  ventureTypes: ['WEB_DEVELOPMENT'],
  requiredKnowledge: ['targetCustomer', 'primaryOffer', 'customerGoalBand', 'weeklyGrowthTimeBand'],
  qualificationQuestions: [
    {
      key: 'target_customer',
      heading: 'Who are you trying to reach?',
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
      heading: 'What do you build most?',
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
  steps: [
    // DEFINE_PRIMARY_OFFER — same new template roofing uses; the copy is generic enough ("what do
    // you sell") to serve both.
    { templateId: 'system-idea-define-primary-offer', horizon: 'TODAY' },
    // VERIFY_PORTFOLIO_OR_HOMEPAGE — same underlying "publish your page" idea as roofing; a
    // developer's homepage *is* their portfolio in this product, so no separate template.
    { templateId: 'system-idea-publish-homepage', horizon: 'TODAY' },
    // BUILD_PROSPECT_LIST — reused as-is.
    { templateId: 'system-idea-first-audience', horizon: 'THIS_WEEK' },
    // SEND_TARGETED_OUTREACH — reuses the same new "contact N prospects" template roofing uses;
    // "prospects" reads correctly for either vertical, so this isn't a separate template.
    {
      templateId: 'system-idea-contact-prospects',
      horizon: 'THIS_WEEK',
      quantityFrom: 'customerGoalBand',
    },
    // FOLLOW_UP_INTERESTED_LEADS — same MANUAL-override reuse as roofing.
    {
      templateId: 'system-idea-leads-flagged-for-follow-up',
      horizon: 'NEXT_WEEK',
      title: 'Follow up with interested leads',
      trackingTypeOverride: 'MANUAL',
    },
    // SEND_PROPOSAL — reuses the existing dynamic "send a proposal" idea as a plain MANUAL
    // reminder, same override technique as the follow-up step above.
    {
      templateId: 'system-idea-send-proposal-to-interested',
      horizon: 'NEXT_WEEK',
      title: 'Send a proposal when someone shows interest',
      trackingTypeOverride: 'MANUAL',
    },
  ],
  reviewTrigger: { minDaysElapsed: 14, minStepsDoneFraction: 0.5 },
}
