import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateAudience } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { audienceBaseSchema, audienceFields } from './audience-form'

type FormData = z.infer<typeof audienceBaseSchema>

export function CreateAudiencePage() {
  const navigate = useNavigate()
  const mutation = useCreateAudience()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Audience</h1>
      <Form<FormData>
        fields={audienceFields}
        schema={audienceBaseSchema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync(data)
          navigate(`/audiences/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Audience"
      />
    </div>
  )
}
