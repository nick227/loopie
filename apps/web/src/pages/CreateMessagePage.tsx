import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateMessage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  channel: z.enum(['EMAIL', 'TEXT', 'SOCIAL']),
  subject: z.string().optional().or(z.literal('')),
  body: z.string().min(1),
  audienceId: z.string(),
  templateId: z.string().optional().or(z.literal('')),
  automationId: z.string().optional().or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'channel', label: 'Channel', type: 'select', voice: false, required: true, options: ['EMAIL', 'TEXT', 'SOCIAL'] },
  { name: 'subject', label: 'Subject', type: 'text', voice: false, required: false },
  { name: 'body', label: 'Body', type: 'textarea', voice: true, required: true, rows: 4 },
  { name: 'audienceId', label: 'Audience Id', type: 'text', voice: false, required: true },
  { name: 'templateId', label: 'Template Id', type: 'text', voice: false, required: false },
  { name: 'automationId', label: 'Automation Id', type: 'text', voice: false, required: false },
  { name: 'scheduledAt', label: 'Scheduled At', type: 'text', voice: false, required: false },
]

export function CreateMessagePage() {
  const navigate = useNavigate()
  const mutation = useCreateMessage()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Message</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Message"
      />
    </div>
  )
}
