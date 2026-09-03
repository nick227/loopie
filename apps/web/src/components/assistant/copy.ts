// Client-owned conversational copy for the V1 happy path (business info -> logo -> homepage ->
// publish). Deliberately kept separate from the server's actionId/operationId contract — this is
// presentation only, so evolving the wording never touches the resolver.
export type AssistantActionId =
  'business_info' | 'business_logo' | 'homepage_create' | 'homepage_publish'

export const STEP_COPY: Record<
  AssistantActionId,
  {
    cardTitle: string
    cardSubtitle: string
    flowHeadline: string
    actionLabel: string
    successMessage: string
  }
> = {
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
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
