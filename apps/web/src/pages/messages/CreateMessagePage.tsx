import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateMessage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { messageBaseSchema, messageFields } from './message-form'

type FormData = z.infer<typeof messageBaseSchema>

export function CreateMessagePage() {
  const navigate = useNavigate()
  const mutation = useCreateMessage()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Message</h1>
      <Form<FormData>
        fields={messageFields}
        schema={messageBaseSchema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync(data)
          navigate(`/messages/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Message"
      />
    </div>
  )
}
