import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateAutomation } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150),
  trigger: z.enum(['MESSAGE_SENT', 'CONTACT_REPLIES', 'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'SALE_RECORDED', 'DATE_REACHED']),
  waitDays: z.coerce.number().min(0).max(30).optional(),
  condition: z.enum(['HAS_REPLIED', 'HAS_NOT_REPLIED', 'LEAD_STILL_OPEN', 'LEAD_REACHED_STAGE', 'CUSTOMER_STATUS', 'CHANNEL_ELIGIBILITY']).optional(),
  conditionValue: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
  action: z.enum(['SEND_EMAIL', 'SEND_TEXT', 'CREATE_REMINDER', 'CHANGE_LEAD_STATUS', 'NOTIFY_USER', 'STOP_SEQUENCE']),
  actionTemplateId: z.string().optional().or(z.literal('')),
  actionValue: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'trigger', label: 'Trigger', type: 'select', voice: false, required: true, options: ['MESSAGE_SENT', 'CONTACT_REPLIES', 'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'SALE_RECORDED', 'DATE_REACHED'] },
  { name: 'waitDays', label: 'Wait Days', type: 'number', voice: false, required: false },
  { name: 'condition', label: 'Condition', type: 'select', voice: false, required: false, options: ['HAS_REPLIED', 'HAS_NOT_REPLIED', 'LEAD_STILL_OPEN', 'LEAD_REACHED_STAGE', 'CUSTOMER_STATUS', 'CHANNEL_ELIGIBILITY'] },
  { name: 'conditionValue', label: 'Condition Value', type: 'json', voice: false, required: false },
  { name: 'action', label: 'Action', type: 'select', voice: false, required: true, options: ['SEND_EMAIL', 'SEND_TEXT', 'CREATE_REMINDER', 'CHANGE_LEAD_STATUS', 'NOTIFY_USER', 'STOP_SEQUENCE'] },
  { name: 'actionTemplateId', label: 'Action Template Id', type: 'text', voice: false, required: false },
  { name: 'actionValue', label: 'Action Value', type: 'json', voice: false, required: false },
]

export function CreateAutomationPage() {
  const navigate = useNavigate()
  const mutation = useCreateAutomation()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Automation</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Automation"
      />
    </div>
  )
}
