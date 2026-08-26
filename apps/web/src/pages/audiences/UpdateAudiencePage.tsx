import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAudience, useUpdateAudience } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import { audienceUpdateSchema, audienceUpdateFields } from './audience-form'

type FormData = z.infer<typeof audienceUpdateSchema>

export function UpdateAudiencePage() {
  const { audienceId } = useParams<{ audienceId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useAudience(audienceId!)
  const mutation = useUpdateAudience()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Audience</h1>
      <Form<FormData>
        fields={audienceUpdateFields}
        schema={audienceUpdateSchema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ audienceId: audienceId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
