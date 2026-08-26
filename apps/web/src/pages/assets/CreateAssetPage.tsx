import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateAsset } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  type: z.enum(['IMAGE', 'TEXT', 'VIDEO', 'AUDIO']),
  name: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal('')),
  textContent: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    voice: false,
    required: true,
    options: ['IMAGE', 'TEXT', 'VIDEO', 'AUDIO'],
  },
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'url', label: 'Url', type: 'url', voice: false, required: false },
  {
    name: 'textContent',
    label: 'Text Content',
    type: 'textarea',
    voice: true,
    required: false,
    rows: 4,
  },
]

export function CreateAssetPage() {
  const navigate = useNavigate()
  const mutation = useCreateAsset()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Asset</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync(data)
          navigate(`/assets/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Asset"
      />
    </div>
  )
}
