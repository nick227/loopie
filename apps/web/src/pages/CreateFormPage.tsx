import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateForm } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150),
  submitLabel: z.string().optional().or(z.literal('')),
  successMessage: z.string().optional().or(z.literal('')),
  fields: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.array(z.record(z.string(), z.unknown()))),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'submitLabel', label: 'Submit Label', type: 'text', voice: false, required: false },
  { name: 'successMessage', label: 'Success Message', type: 'textarea', voice: true, required: false, rows: 4 },
  { name: 'fields', label: 'Fields', type: 'json', voice: false, required: true },
]

export function CreateFormPage() {
  const navigate = useNavigate()
  const mutation = useCreateForm()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Form</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data as any)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Form"
      />
    </div>
  )
}
