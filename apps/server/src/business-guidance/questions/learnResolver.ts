// The Learn phase's question resolver (docs/.../03-poc-implementation-plan.md section 6) — pure,
// no Prisma, unit-testable without a DB. Traverses the venture taxonomy one level at a time, then
// resolves a goal, then hands off to the selected playbook's own qualification questions. "known
// fact -> skip question" (01-requirements.md's Reuse rule) falls out naturally: each step only
// returns a question for the first still-missing fact.
import { ventureTaxonomy, findVentureNode, type TaxonomyNode } from '../taxonomy/ventures'
import { goalChoices } from '../goals/goals'
import { selectPlaybook } from '../playbooks'
import type { BusinessKnowledge } from '../knowledge/businessKnowledge'
import type { AssistantChoice, AssistantChoiceStep } from '../types'

const toChoices = (nodes: TaxonomyNode[]): AssistantChoice[] =>
  nodes.map((node) => ({ value: node.key, label: node.label }))

export type LearnResult =
  | { done: false; step: AssistantChoiceStep; knownFacts: string[] }
  | { done: true; playbookKey: string; knownFacts: string[] }

// Returns the next unanswered Learn question, or `done: true` once the taxonomy + goal +
// playbook-specific qualification facts are all known. Never returns more than 6 choices at a
// taxonomy level and never re-asks a fact already present in `knowledge`. `knownFacts` is a plain
// ordered label trail (e.g. ["Local service", "Home services", "Roofing"]) of everything already
// established — built up as this function walks the same facts, not a separate pass — so the UI
// can show progress as something cumulative ("what Loopie already knows") instead of a
// question-count/percentage, which would be misleading anyway since known facts get skipped.
export function resolveLearnQuestion(knowledge: BusinessKnowledge): LearnResult {
  const knownFacts: string[] = []

  if (!knowledge.ventureFamily) {
    return {
      done: false,
      knownFacts,
      step: {
        key: 'venture_family',
        heading: 'Tell Loopie about your business.',
        choices: toChoices(ventureTaxonomy).slice(0, 6),
        writesKnowledge: 'ventureFamily',
      },
    }
  }
  const family = findVentureNode(knowledge.ventureFamily)
  knownFacts.push(family?.label ?? knowledge.ventureFamily)

  if (!knowledge.businessGroup && family?.children) {
    return {
      done: false,
      knownFacts,
      step: {
        key: 'business_group',
        heading: family.label,
        choices: toChoices(family.children),
        writesKnowledge: 'businessGroup',
      },
    }
  }

  const group = knowledge.businessGroup ? findVentureNode(knowledge.businessGroup) : undefined
  if (group) knownFacts.push(group.label)

  if (!knowledge.ventureType && group?.children) {
    return {
      done: false,
      knownFacts,
      step: {
        key: 'venture_type',
        heading: group.label,
        choices: toChoices(group.children),
        writesKnowledge: 'ventureType',
      },
    }
  }

  const ventureType = knowledge.ventureType ? findVentureNode(knowledge.ventureType) : undefined
  if (ventureType) knownFacts.push(ventureType.label)

  if (!knowledge.primaryGoal) {
    return {
      done: false,
      knownFacts,
      step: {
        key: 'primary_goal',
        heading: 'Choose a goal',
        choices: goalChoices.map((goal) => ({ value: goal.key, label: goal.label })),
        writesKnowledge: 'primaryGoal',
      },
    }
  }
  const goalLabel = goalChoices.find((g) => g.key === knowledge.primaryGoal)?.label
  if (goalLabel) knownFacts.push(goalLabel)

  const playbook = selectPlaybook(knowledge.primaryGoal, {
    ventureType: knowledge.ventureType,
    businessGroup: knowledge.businessGroup,
    traits: knowledge.traits ?? ventureType?.traits ?? [],
  })

  if (!playbook) {
    // A goal with no playbook in the POC (anything but GET_MORE_CUSTOMERS) — Learn is "done" with
    // no playbook, so the caller falls back to an existing deterministic action instead.
    return { done: true, playbookKey: '', knownFacts }
  }

  for (const question of playbook.qualificationQuestions) {
    const key = question.writesKnowledge as keyof BusinessKnowledge
    const value = knowledge[key]
    if (!value) return { done: false, knownFacts, step: question }
    const choice = question.choices.find((c) => c.value === value)
    if (choice) knownFacts.push(choice.label)
  }

  return { done: true, playbookKey: playbook.key, knownFacts }
}
