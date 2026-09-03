import { useNextAction } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { STEP_COPY, type AssistantActionId } from './copy'
import { EDUCATION_TOPICS, type EducationTopicId } from './education'

// One-line framing per resolver `type`, for "How do I get started?" — deliberately just a
// prefix on the same fixed path explanation, not a rewrite of it, so this stays "state-aware
// where useful" rather than a second copy of the resolver's own logic.
const GET_STARTED_STAGE_NOTE: Record<string, string> = {
  BUSINESS_PROFILE: "You're just getting started — here's the path ahead.",
  PAGE: "Your business profile is in good shape — here's what's next.",
  ADVERTISING: "Your page is live — here's what's next.",
  CALENDAR: "You've already covered the basics below — here's the path you walked.",
}

// One-sentence "why this matters" per actionId, for "What should I do next?" — kept separate
// from copy.ts's UI-facing card/flow copy (which is terse by design) since this answer needs a
// real explanatory sentence, not a label.
const WHY_IT_MATTERS: Partial<Record<AssistantActionId, string>> = {
  business_info:
    'A complete profile makes every page and message you send look credible and lets customers reach you.',
  business_logo: 'A logo makes your homepage and pages look like a real, trustworthy business.',
  homepage_create: 'A homepage gives you a real place to send people, instead of just a profile.',
  homepage_publish: 'An unpublished page has no visitors — publishing is what makes it real.',
  page_publish: "This page is built but not live yet, so it can't bring in any leads.",
  campaign_create:
    'A published page with no promotion has no visitors — a campaign is what actually sends people to it.',
  campaign_resume: "This campaign is set up but has no creative yet, so it can't run.",
  calendar:
    'Once the basics are covered, this is the highest-value thing Loopie can find for you right now.',
}

function EducationGetStartedAnswer({ onSeeWhatsNext }: { onSeeWhatsNext: () => void }) {
  const { data } = useNextAction()
  const note = data ? GET_STARTED_STAGE_NOTE[data.type] : null

  return (
    <div className="space-y-3">
      {note ? <p className="text-sm text-foreground">{note}</p> : null}
      <p className="text-sm text-muted-foreground">
        Loopie follows one basic path: complete your business profile, publish a useful page,
        promote it to bring in visitors, then capture and follow up with the leads it generates.
      </p>
      <Button variant="outline" size="sm" onClick={onSeeWhatsNext}>
        What should I do next?
      </Button>
    </div>
  )
}

// "Expose the same real action button" — reuses the exact card copy/action label the Home card
// and Flow step already use, and the button hands off into the real Flow screen rather than
// duplicating any mutation here. This info view itself never mutates anything.
function EducationWhatsNextAnswer({ onOpenFlow }: { onOpenFlow: () => void }) {
  const { data, isLoading } = useNextAction()

  if (isLoading || !data) {
    return (
      <div className="py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  const actionId = data.actionId as AssistantActionId
  const copy = STEP_COPY[actionId]

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Right now, the most useful thing you can do is{' '}
        <strong className="font-semibold">{copy.cardTitle.toLowerCase()}</strong>.
      </p>
      <p className="text-sm text-muted-foreground">{WHY_IT_MATTERS[actionId]}</p>
      <Button onClick={onOpenFlow} className="w-full">
        {copy.actionLabel}
      </Button>
    </div>
  )
}

export function AssistantEducationDetail({
  topicId,
  onOpenFlow,
  onSelectTopic,
}: {
  topicId: EducationTopicId
  onOpenFlow: () => void
  onSelectTopic: (id: EducationTopicId) => void
}) {
  const topic = EDUCATION_TOPICS.find((t) => t.id === topicId)!

  return (
    <div className="flex-1 space-y-4 py-2">
      <p className="text-base font-medium text-foreground">{topic.question}</p>
      {topic.answer ? (
        <p className="text-sm text-muted-foreground">{topic.answer}</p>
      ) : topic.id === 'how_do_i_get_started' ? (
        <EducationGetStartedAnswer onSeeWhatsNext={() => onSelectTopic('what_should_i_do_next')} />
      ) : topic.id === 'what_should_i_do_next' ? (
        <EducationWhatsNextAnswer onOpenFlow={onOpenFlow} />
      ) : null}
    </div>
  )
}
