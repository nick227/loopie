const TRIGGERS: Record<string, string> = {
  MESSAGE_SENT: 'Message sent',
  CONTACT_REPLIES: 'Contact replies',
  LEAD_CREATED: 'Lead created',
  LEAD_STATUS_CHANGED: 'Lead status changed',
  SALE_RECORDED: 'Sale recorded',
  DATE_REACHED: 'Date reached',
}

const ACTIONS: Record<string, string> = {
  SEND_EMAIL: 'Send email',
  SEND_TEXT: 'Send text',
  CREATE_REMINDER: 'Create reminder',
  CHANGE_LEAD_STATUS: 'Change lead status',
  NOTIFY_USER: 'Notify user',
  STOP_SEQUENCE: 'Stop sequence',
}

const OUTCOMES: Record<string, string> = {
  SENT: 'Executed',
  SKIPPED: 'Skipped',
  FAILED: 'Failed',
}

export function triggerLabel(trigger: string) {
  return TRIGGERS[trigger] ?? trigger
}

export function actionLabel(action: string) {
  return ACTIONS[action] ?? action
}

export function outcomeLabel(outcome: string) {
  return OUTCOMES[outcome] ?? outcome
}

export function automationStatusLabel(isActive: boolean) {
  return isActive ? 'Active' : 'Paused'
}
