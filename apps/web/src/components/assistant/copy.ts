// Client-owned conversational copy for the assistant's cross-product action set. Deliberately
// separate from the server's type/actionId/operationId contract — this is presentation only, so
// evolving the wording never touches the resolver.
export type AssistantActionId =
  | 'business_info'
  | 'business_logo'
  | 'homepage_create'
  | 'homepage_publish'
  | 'page_publish'
  | 'campaign_create'
  | 'campaign_resume'
  | 'calendar'

type ActionCopy = {
  cardTitle: string
  cardSubtitle: string
  flowHeadline: string
  actionLabel: string
  successMessage: string
}

export const STEP_COPY: Record<AssistantActionId, ActionCopy> = {
  business_info: {
    cardTitle: 'Finish your business profile',
    cardSubtitle: 'A couple quick details to get started',
    flowHeadline: "Let's get your business looking official.",
    actionLabel: 'Continue',
    successMessage: 'Business details saved',
  },
  business_logo: {
    cardTitle: 'Add your logo',
    cardSubtitle: 'Make your homepage look official',
    flowHeadline: 'Do you have a logo you’d like to use?',
    actionLabel: 'Upload a logo',
    successMessage: 'Logo added',
  },
  homepage_create: {
    cardTitle: 'Create your homepage',
    cardSubtitle: 'Get a page live in minutes',
    flowHeadline: "Let's build your homepage from a template you can edit anytime.",
    actionLabel: 'Create homepage',
    successMessage: 'Homepage created',
  },
  homepage_publish: {
    cardTitle: 'Publish your homepage',
    cardSubtitle: 'You’re one click from going live',
    flowHeadline: 'Your homepage is ready to go live.',
    actionLabel: 'Publish homepage',
    successMessage: 'Your homepage is live',
  },
  page_publish: {
    cardTitle: 'Publish your other page',
    cardSubtitle: 'You have a page ready to go live',
    flowHeadline: 'You have an unpublished page.',
    actionLabel: 'Publish it',
    successMessage: 'Page published',
  },
  campaign_create: {
    cardTitle: 'Promote your page',
    cardSubtitle: 'Nobody is being sent to it yet',
    flowHeadline: "Your page is live, but nobody's being sent to it yet.",
    actionLabel: 'Create your first promotion',
    successMessage: 'Promotion created',
  },
  campaign_resume: {
    cardTitle: 'Finish setting up your campaign',
    cardSubtitle: 'A draft campaign is waiting on creatives',
    flowHeadline: 'You started a campaign but it still needs a creative.',
    actionLabel: 'Finish setting up your campaign',
    successMessage: '',
  },
  calendar: {
    cardTitle: 'Keep growing',
    cardSubtitle: 'A next move for your business',
    flowHeadline: 'Keep growing your business.',
    actionLabel: 'Add to this week',
    successMessage: 'Added to your calendar',
  },
}

// page_publish is the first actionId needing a real instance name interpolated into copy — kept
// as one small function rather than growing a templating system.
export function pagePublishCardSubtitle(pageName: string) {
  return `"${pageName}" is ready to go live`
}

export function campaignCreateFlowHeadline(pageName: string) {
  return `"${pageName}" is live, but nobody's being sent to it yet.`
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
