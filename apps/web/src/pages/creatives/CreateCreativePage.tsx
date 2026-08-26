import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateCreative } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150),
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
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'assetIds', label: 'Asset Ids', type: 'tags', voice: false, required: true },
]

export function CreateCreativePage() {
  const navigate = useNavigate()
  const mutation = useCreateCreative()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Creative</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync(data)
          navigate(`/creatives/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Creative"
      />
    </div>
  )
}
