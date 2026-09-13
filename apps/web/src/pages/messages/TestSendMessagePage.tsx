import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useTestSendMessage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'
import { apiErrorMessage } from '@/lib/apiError'

const schema = z.object({
  toEmailOrPhone: z.string().email(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  {
    name: 'toEmailOrPhone',
    label: 'To Email Or Phone',
    type: 'email',
    voice: false,
    required: true,
  },
]

export function TestSendMessagePage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const mutation = useTestSendMessage()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Test Send Message</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          try {
            await mutation.mutateAsync({ messageId: messageId!, ...data })
            toast.success('Test message sent')
            navigate(-1)
          } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not send this test message.'))
          }
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Test Send Message"
      />
    </div>
  )
}
