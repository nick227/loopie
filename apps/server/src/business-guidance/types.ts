// Shared choice-step shape (docs/.../03-poc-implementation-plan.md section 13) — the one thing
// both the Learn taxonomy resolver and every playbook's qualification questions return. Content
// (heading/choices) travels in this object rather than being looked up client-side by an id, since
// it's inherently dynamic (varies by taxonomy node / playbook / computed quantities).
//
// Content style contract — every heading/title/detail authored anywhere in business-guidance
// follows this (2026-09-04, "operating system, not a bag of tips" pass):
//   - Atomic: one concrete action per title. Never join two decisions with "and" ("send a seasonal
//     offer to past customers" bundles an offer decision, a channel decision, and a targeting
//     decision — split it into separate steps instead).
//   - Imperative or topic phrasing, never a literal question. "How often to schedule emails," not
//     "How often should I schedule them?" A Learn heading names the fact being established
//     ("Team size," "Monthly marketing budget"), it doesn't ask the user a question with a "?".
//   - Specific enough to act on this week. "Log maintenance intervals for your two most-used
//     machines," never "Improve your operations."
export type AssistantChoice = { value: string; label: string }

export type AssistantChoiceStep = {
  key: string
  heading: string
  // One short sentence, only when it adds value — never explanatory filler above self-explanatory
  // choices (content rule in docs/.../01-requirements.md).
  description?: string
  choices: AssistantChoice[]
  writesKnowledge: string
}

// A business's real team size, asked once in Learn right after the primary goal (2026-09-04) so
// every playbook's step selection can branch on it immediately — a multi-person business sees
// team-appropriate content in its very first plan, not after some later "unlock."
export type TeamSizeBand = 'SOLO' | 'SMALL_TEAM' | 'ESTABLISHED_TEAM'
