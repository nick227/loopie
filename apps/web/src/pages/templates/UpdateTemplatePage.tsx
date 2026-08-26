import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useTemplate, useUpdateTemplate } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150).optional().or(z.literal('')),
  subject: z.string().optional().or(z.literal('')),
  body: z.string().min(1).optional().or(z.literal('')),
  cta: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'subject', label: 'Subject', type: 'text', voice: false, required: false },
  { name: 'body', label: 'Body', type: 'textarea', voice: true, required: false, rows: 4 },
  { name: 'cta', label: 'Cta', type: 'text', voice: false, required: false },
]

export function UpdateTemplatePage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useTemplate(templateId!)
  const mutation = useUpdateTemplate()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Template</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ templateId: templateId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
