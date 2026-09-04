// Shared choice-step shape (docs/.../03-poc-implementation-plan.md section 13) — the one thing
// both the Learn taxonomy resolver and every playbook's qualification questions return. Content
// (heading/choices) travels in this object rather than being looked up client-side by an id, since
// it's inherently dynamic (varies by taxonomy node / playbook / computed quantities).
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
