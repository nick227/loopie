import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm, useUpdateForm } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().optional().or(z.literal('')),
  submitLabel: z.string().optional().or(z.literal('')),
  successMessage: z.string().optional().or(z.literal('')),
  fields: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.array(z.record(z.string(), z.unknown()))).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'submitLabel', label: 'Submit Label', type: 'text', voice: false, required: false },
  { name: 'successMessage', label: 'Success Message', type: 'textarea', voice: true, required: false, rows: 4 },
  { name: 'fields', label: 'Fields', type: 'json', voice: false, required: false },
]

export function UpdateFormPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useForm(formId!)
  const mutation = useUpdateForm()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Form</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ formId: formId!, ...formData } as any)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
