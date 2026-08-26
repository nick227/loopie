import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateAudience } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['SAVED_FILTER', 'MANUAL_LIST', 'IMPORTED_LIST']),
  filter: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
  contactIds: z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v), z.array(z.string())).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'type', label: 'Type', type: 'select', voice: false, required: true, options: ['SAVED_FILTER', 'MANUAL_LIST', 'IMPORTED_LIST'] },
  { name: 'filter', label: 'Filter', type: 'json', voice: false, required: false },
  { name: 'contactIds', label: 'Contact Ids', type: 'tags', voice: false, required: false },
]

export function CreateAudiencePage() {
  const navigate = useNavigate()
  const mutation = useCreateAudience()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Audience</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Audience"
      />
    </div>
  )
}
