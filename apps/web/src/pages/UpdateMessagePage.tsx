import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useMessage, useUpdateMessage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  subject: z.string().optional().or(z.literal('')),
  body: z.string().min(1).optional().or(z.literal('')),
  audienceId: z.string().optional().or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'subject', label: 'Subject', type: 'text', voice: false, required: false },
  { name: 'body', label: 'Body', type: 'textarea', voice: true, required: false, rows: 4 },
  { name: 'audienceId', label: 'Audience Id', type: 'text', voice: false, required: false },
  { name: 'scheduledAt', label: 'Scheduled At', type: 'text', voice: false, required: false },
]

export function UpdateMessagePage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useMessage(messageId!)
  const mutation = useUpdateMessage()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Message</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ messageId: messageId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
