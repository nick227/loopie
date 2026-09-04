// The first goal choice (docs/loopie-assistant-playbook-poc/02-feature-analysis.md section 6) —
// kept concrete on purpose: "the user does not need to know internal concepts such as
// CUSTOMER_ACQUISITION." Only GET_MORE_CUSTOMERS gets a full playbook in the POC (see
// playbooks/index.ts); the rest route to an existing deterministic Assistant/Calendar action per
// the implementation plan's scoped POC.
export const goalChoices = [
  { key: 'GET_MORE_CUSTOMERS', label: 'Get more customers' },
  { key: 'MAKE_MORE_SALES', label: 'Make more sales' },
  { key: 'PROMOTE_BUSINESS', label: 'Promote my business' },
  { key: 'LAUNCH_SOMETHING', label: 'Launch something' },
  { key: 'IMPROVE_WEBSITE', label: 'Improve my website' },
  { key: 'FOLLOW_UP_LEADS', label: 'Follow up with leads' },
] as const

export type GoalKey = (typeof goalChoices)[number]['key']
