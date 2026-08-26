import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useMessage, useUpdateMessage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import { messageUpdateSchema, messageUpdateFields } from './message-form'

type FormData = z.infer<typeof messageUpdateSchema>

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
        fields={messageUpdateFields}
        schema={messageUpdateSchema}
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
