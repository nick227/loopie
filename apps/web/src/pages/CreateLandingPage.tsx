import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateLandingPage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(80),
  formId: z.string().optional().or(z.literal('')),
  content: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
  theme: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'templateId', label: 'Template Id', type: 'text', voice: false, required: true },
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'slug', label: 'Slug', type: 'text', voice: false, required: true },
  { name: 'formId', label: 'Form Id', type: 'text', voice: false, required: false },
  { name: 'content', label: 'Content', type: 'json', voice: false, required: false },
  { name: 'theme', label: 'Theme', type: 'json', voice: false, required: false },
]

export function CreateLandingPage() {
  const navigate = useNavigate()
  const mutation = useCreateLandingPage()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Landing</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Landing"
      />
    </div>
  )
}
