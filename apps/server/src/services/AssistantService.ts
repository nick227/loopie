import { db } from '@project/db'
import { BusinessService } from './BusinessService'
import { ASSISTANT_STEPS, HOMEPAGE_TEMPLATE_ID, type AssistantState } from '../lib/assistantSteps'

const businessService = new BusinessService()

export class AssistantService {
  async getNextStep(businessId: string) {
    const business = await businessService.get(businessId)
    const homepage = await db.landingPage.findFirst({
      where: { businessId, templateId: HOMEPAGE_TEMPLATE_ID },
      orderBy: { createdAt: 'asc' },
    })
    const state: AssistantState = { business, homepage }

    const step = ASSISTANT_STEPS.find((s) => !s.isComplete(state))
    if (!step) {
      return {
        actionId: null,
        operationId: null,
        question: null,
        fields: null,
        landingPageId: null,
        progress: { completed: ASSISTANT_STEPS.length, total: ASSISTANT_STEPS.length },
      }
    }

    return {
      actionId: step.actionId,
      operationId: step.operationId,
      question: step.question,
      fields: step.getFields ? step.getFields(state) : null,
      landingPageId: step.actionId === 'homepage_publish' ? homepage!.id : null,
      progress: { completed: ASSISTANT_STEPS.indexOf(step), total: ASSISTANT_STEPS.length },
    }
  }
}
