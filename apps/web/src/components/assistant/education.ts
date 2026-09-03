// Site Education — a small, curated, deterministic set of help topics inside the assistant.
// Deliberately not a CMS or a generic knowledge engine: adding a topic means adding one entry
// here (a static `answer` string), or — for a topic whose answer depends on live state — one
// more entry here (question only) plus one small render case in
// AssistantEducationDetail.tsx, the same way FlowView already switches on actionId rather than
// interpreting a generic schema. Future topics (Pages, Ads, CRM, Messaging, Teams, Media,
// publishing, getting customers) slot in the same way.
export type EducationTopicId =
  'what_is_this_site' | 'how_do_i_get_started' | 'what_should_i_do_next'

export interface EducationTopic {
  id: EducationTopicId
  question: string
  // Present for topics with fixed prose. Omitted for topics whose answer depends on live state
  // (how_do_i_get_started, what_should_i_do_next) — those render their own small component,
  // switched on id in AssistantEducationDetail.tsx.
  answer?: string
}

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: 'what_is_this_site',
    question: 'What is this site?',
    answer:
      "Loopie is one platform for running your business's marketing and customer follow-up. Your Business Profile is the identity every page and listing draws from. Pages are what you publish and share, and Advertising promotes them to bring in visitors. Every lead that comes in — from a page or anywhere else — lands in one shared CRM pipeline, and Messaging is how you follow up by email or text. Calendar is your ongoing coaching checklist, and this Assistant ties all of it together by finding the single most useful thing to do right now.",
  },
  { id: 'how_do_i_get_started', question: 'How do I get started?' },
  { id: 'what_should_i_do_next', question: 'What should I do next?' },
]
