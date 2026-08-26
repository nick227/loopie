import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreative, useUpdateCreative } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().optional().or(z.literal('')),
  assetIds: z.preprocess(
    (v) =>
      typeof v === 'string'
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : v,
    z.array(z.string()),
  ),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'assetIds', label: 'Asset Ids', type: 'tags', voice: false, required: true },
]

export function UpdateCreativePage() {
  const { creativeId } = useParams<{ creativeId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useCreative(creativeId!)
  const mutation = useUpdateCreative()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Creative</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ creativeId: creativeId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
