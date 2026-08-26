import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAudience, useUpdateAudience } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(120).optional().or(z.literal('')),
  filter: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'filter', label: 'Filter', type: 'json', voice: false, required: false },
]

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
        fields={fields}
        schema={schema}
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
