/**
 * Reference POC for the expandable business taxonomy.
 * This is intentionally declarative. Adapt names/paths to the Loopie repo.
 */

export type BusinessTrait =
  | 'LOCAL'
  | 'ONLINE'
  | 'HIGH_TICKET'
  | 'QUOTE_BASED'
  | 'APPOINTMENT_BASED'
  | 'PROJECT_BASED'
  | 'RECURRING_REVENUE'
  | 'SUBSCRIPTION'
  | 'FOOT_TRAFFIC'
  | 'RETAIL'
  | 'AUDIENCE_DRIVEN'
  | 'EVENT_DRIVEN'

export type TaxonomyNode = {
  key: string
  label: string
  children?: TaxonomyNode[]
  traits?: BusinessTrait[]
}

export const ventureTaxonomy: TaxonomyNode[] = [
  {
    key: 'LOCAL_SERVICES',
    label: 'Local service',
    children: [
      {
        key: 'HOME_SERVICES',
        label: 'Home services',
        children: [
          {
            key: 'ROOFING',
            label: 'Roofing',
            traits: ['LOCAL', 'HIGH_TICKET', 'QUOTE_BASED', 'PROJECT_BASED'],
          },
          { key: 'PLUMBING', label: 'Plumbing', traits: ['LOCAL', 'QUOTE_BASED'] },
          { key: 'HVAC', label: 'HVAC', traits: ['LOCAL', 'HIGH_TICKET', 'QUOTE_BASED'] },
          { key: 'PAINTING', label: 'Painting', traits: ['LOCAL', 'QUOTE_BASED', 'PROJECT_BASED'] },
          { key: 'HANDYMAN', label: 'Handyman', traits: ['LOCAL', 'QUOTE_BASED'] },
        ],
      },
      {
        key: 'PROPERTY_OUTDOOR',
        label: 'Property & outdoor',
        children: [
          { key: 'LAWN_MOWING', label: 'Lawn mowing', traits: ['LOCAL', 'RECURRING_REVENUE'] },
          {
            key: 'LANDSCAPING',
            label: 'Landscaping',
            traits: ['LOCAL', 'QUOTE_BASED', 'PROJECT_BASED'],
          },
          { key: 'PRESSURE_WASHING', label: 'Pressure washing', traits: ['LOCAL', 'QUOTE_BASED'] },
        ],
      },
      {
        key: 'AUTOMOTIVE',
        label: 'Automotive',
        children: [
          {
            key: 'AUTO_DETAILING',
            label: 'Auto detailing',
            traits: ['LOCAL', 'APPOINTMENT_BASED'],
          },
          {
            key: 'MOBILE_MECHANIC',
            label: 'Mobile mechanic',
            traits: ['LOCAL', 'APPOINTMENT_BASED'],
          },
        ],
      },
      {
        key: 'CREATIVE_EVENT_SERVICES',
        label: 'Creative & event',
        children: [
          {
            key: 'PHOTOGRAPHY_SERVICE',
            label: 'Photography',
            traits: ['LOCAL', 'PROJECT_BASED', 'APPOINTMENT_BASED'],
          },
          { key: 'VIDEOGRAPHY_SERVICE', label: 'Videography', traits: ['LOCAL', 'PROJECT_BASED'] },
        ],
      },
    ],
  },
  {
    key: 'PROFESSIONAL_SERVICES',
    label: 'Professional service',
    children: [
      {
        key: 'DIGITAL_SERVICES',
        label: 'Digital services',
        children: [
          {
            key: 'WEB_DEVELOPMENT',
            label: 'Web development',
            traits: ['ONLINE', 'HIGH_TICKET', 'QUOTE_BASED', 'PROJECT_BASED'],
          },
          {
            key: 'SOFTWARE_CONSULTING',
            label: 'Software consulting',
            traits: ['ONLINE', 'HIGH_TICKET', 'PROJECT_BASED'],
          },
          {
            key: 'AI_CONSULTING',
            label: 'AI consulting',
            traits: ['ONLINE', 'HIGH_TICKET', 'PROJECT_BASED'],
          },
          {
            key: 'MARKETING_AGENCY',
            label: 'Marketing agency',
            traits: ['ONLINE', 'PROJECT_BASED', 'RECURRING_REVENUE'],
          },
          { key: 'DESIGN_STUDIO', label: 'Design studio', traits: ['ONLINE', 'PROJECT_BASED'] },
        ],
      },
      {
        key: 'BUSINESS_SERVICES',
        label: 'Business services',
        children: [
          {
            key: 'BUSINESS_CONSULTING',
            label: 'Business consulting',
            traits: ['HIGH_TICKET', 'PROJECT_BASED'],
          },
          { key: 'RECRUITING', label: 'Recruiting', traits: ['HIGH_TICKET', 'PROJECT_BASED'] },
          {
            key: 'VIRTUAL_ASSISTANCE',
            label: 'Virtual assistance',
            traits: ['ONLINE', 'RECURRING_REVENUE'],
          },
        ],
      },
      {
        key: 'FINANCIAL_SERVICES',
        label: 'Financial services',
        children: [
          { key: 'ACCOUNTING', label: 'Accounting', traits: ['RECURRING_REVENUE'] },
          { key: 'BOOKKEEPING', label: 'Bookkeeping', traits: ['RECURRING_REVENUE'] },
        ],
      },
    ],
  },
  {
    key: 'FOOD_HOSPITALITY',
    label: 'Food & hospitality',
    children: [
      {
        key: 'FIXED_LOCATION_FOOD',
        label: 'Fixed location',
        children: [
          { key: 'RESTAURANT', label: 'Restaurant', traits: ['LOCAL', 'FOOT_TRAFFIC'] },
          { key: 'COFFEE_SHOP', label: 'Coffee shop', traits: ['LOCAL', 'FOOT_TRAFFIC'] },
          { key: 'BAKERY', label: 'Bakery', traits: ['LOCAL', 'FOOT_TRAFFIC', 'RETAIL'] },
        ],
      },
      {
        key: 'MOBILE_FOOD',
        label: 'Mobile food',
        children: [
          {
            key: 'FOOD_TRUCK',
            label: 'Food truck',
            traits: ['LOCAL', 'FOOT_TRAFFIC', 'EVENT_DRIVEN'],
          },
          { key: 'POP_UP_RESTAURANT', label: 'Pop-up', traits: ['LOCAL', 'EVENT_DRIVEN'] },
        ],
      },
    ],
  },
  {
    key: 'HEALTH_WELLNESS',
    label: 'Health & wellness',
    children: [
      {
        key: 'FITNESS',
        label: 'Fitness',
        children: [
          {
            key: 'PERSONAL_TRAINER',
            label: 'Personal trainer',
            traits: ['LOCAL', 'APPOINTMENT_BASED', 'RECURRING_REVENUE'],
          },
          {
            key: 'FITNESS_STUDIO',
            label: 'Fitness studio',
            traits: ['LOCAL', 'APPOINTMENT_BASED', 'RECURRING_REVENUE'],
          },
          {
            key: 'YOGA_INSTRUCTOR',
            label: 'Yoga instructor',
            traits: ['LOCAL', 'APPOINTMENT_BASED'],
          },
        ],
      },
    ],
  },
  {
    key: 'CREATOR_MEDIA',
    label: 'Creator & media',
    children: [
      {
        key: 'PUBLISHING',
        label: 'Publishing',
        children: [
          {
            key: 'SELF_PUBLISHING',
            label: 'Self-publishing',
            traits: ['ONLINE', 'AUDIENCE_DRIVEN'],
          },
          {
            key: 'INDEPENDENT_AUTHOR',
            label: 'Independent author',
            traits: ['ONLINE', 'AUDIENCE_DRIVEN'],
          },
          { key: 'PUBLISHING_AGENCY', label: 'Publishing agency', traits: ['PROJECT_BASED'] },
          {
            key: 'NEWSLETTER',
            label: 'Newsletter',
            traits: ['ONLINE', 'AUDIENCE_DRIVEN', 'SUBSCRIPTION'],
          },
        ],
      },
      {
        key: 'AUDIENCE_MEDIA',
        label: 'Audience media',
        children: [
          {
            key: 'YOUTUBE_CREATOR',
            label: 'YouTube creator',
            traits: ['ONLINE', 'AUDIENCE_DRIVEN'],
          },
          { key: 'PODCASTER', label: 'Podcaster', traits: ['ONLINE', 'AUDIENCE_DRIVEN'] },
        ],
      },
    ],
  },
  {
    key: 'RETAIL_ECOMMERCE',
    label: 'Retail & ecommerce',
    children: [
      {
        key: 'PHYSICAL_PRODUCTS',
        label: 'Physical products',
        children: [
          { key: 'APPAREL', label: 'Apparel', traits: ['RETAIL'] },
          { key: 'HANDMADE_GOODS', label: 'Handmade goods', traits: ['RETAIL'] },
          { key: 'BEAUTY_PRODUCTS', label: 'Beauty products', traits: ['RETAIL'] },
        ],
      },
      {
        key: 'DIGITAL_PRODUCTS',
        label: 'Digital products',
        children: [
          { key: 'DIGITAL_PRODUCT_BUSINESS', label: 'Digital products', traits: ['ONLINE'] },
          {
            key: 'SUBSCRIPTION_PRODUCT',
            label: 'Subscription product',
            traits: ['ONLINE', 'SUBSCRIPTION', 'RECURRING_REVENUE'],
          },
        ],
      },
    ],
  },
]

export const goalChoices = [
  { key: 'GET_MORE_CUSTOMERS', label: 'Get more customers' },
  { key: 'MAKE_MORE_SALES', label: 'Make more sales' },
  { key: 'PROMOTE_BUSINESS', label: 'Promote my business' },
  { key: 'LAUNCH_SOMETHING', label: 'Launch something' },
  { key: 'IMPROVE_WEBSITE', label: 'Improve my website' },
  { key: 'FOLLOW_UP_LEADS', label: 'Follow up with leads' },
] as const

export type AssistantChoice = { value: string; label: string }

export type AssistantChoiceStep = {
  key: string
  heading: string
  description?: string
  choices: AssistantChoice[]
  writesKnowledge?: string
}

export type BusinessKnowledge = {
  ventureFamily?: string
  businessGroup?: string
  ventureType?: string
  traits?: BusinessTrait[]
  primaryGoal?: string
  targetCustomer?: string
  serviceArea?: string
  primaryOffer?: string
  marketingBudgetBand?: string
  weeklyGrowthTimeBand?: string
  customerGoalBand?: string
}

const findNode = (nodes: TaxonomyNode[], key: string): TaxonomyNode | undefined => {
  for (const node of nodes) {
    if (node.key === key) return node
    const child = node.children && findNode(node.children, key)
    if (child) return child
  }
}

const choices = (nodes: TaxonomyNode[]): AssistantChoice[] =>
  nodes.map((node) => ({ value: node.key, label: node.label }))

/**
 * Demonstrates conditional Learn traversal.
 * Production should also read canonical Business fields before asking.
 */
export function resolveTaxonomyQuestion(knowledge: BusinessKnowledge): AssistantChoiceStep | null {
  if (!knowledge.ventureFamily) {
    return {
      key: 'venture_family',
      heading: 'Tell Loopie about your business.',
      choices: choices(ventureTaxonomy).slice(0, 6),
      writesKnowledge: 'ventureFamily',
    }
  }

  const family = findNode(ventureTaxonomy, knowledge.ventureFamily)
  if (!knowledge.businessGroup && family?.children) {
    return {
      key: 'business_group',
      heading: family.label,
      choices: choices(family.children),
      writesKnowledge: 'businessGroup',
    }
  }

  const group = knowledge.businessGroup && findNode(ventureTaxonomy, knowledge.businessGroup)
  if (!knowledge.ventureType && group?.children) {
    return {
      key: 'venture_type',
      heading: group.label,
      choices: choices(group.children),
      writesKnowledge: 'ventureType',
    }
  }

  if (!knowledge.primaryGoal) {
    return {
      key: 'primary_goal',
      heading: 'Choose a goal',
      choices: goalChoices.map((goal) => ({ value: goal.key, label: goal.label })),
      writesKnowledge: 'primaryGoal',
    }
  }

  return null
}

export const qualificationQuestions: AssistantChoiceStep[] = [
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
]
