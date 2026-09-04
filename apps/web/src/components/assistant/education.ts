// Site Education — a small, curated, deterministic set of help topics inside the assistant.
// Deliberately not a CMS or a generic knowledge engine: adding a topic means adding one entry
// here (a static `answer` string), or — for a topic whose answer depends on live state — one
// more entry here (question only) plus one small render case in
// AssistantEducationDetail.tsx, the same way FlowView already switches on actionId rather than
// interpreting a generic schema. Future topics (Pages, Ads, CRM, Messaging, Teams, Media,
// publishing, getting customers) slot in the same way.
export type EducationTopicId = 'what_is_this_site' | 'what_should_i_do_next'

export interface EducationTopic {
  id: EducationTopicId
  question: string
  // Present for topics with fixed prose. Omitted for topics whose answer depends on live state
  // switched on id in AssistantEducationDetail.tsx.
  answer?: string
}

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: 'what_is_this_site',
    question: 'What is this site?',
    answer:
      "Loopie gives you the power of an ad-server, CRM, and publishing platform in one place. It's a single place to manage your online content.",
  },
  { id: 'what_should_i_do_next', question: 'What should I do next?' },
]
