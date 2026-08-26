import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAutomation, useUpdateAutomation } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().optional().or(z.literal('')),
  waitDays: z.coerce.number().min(0).max(30).optional(),
  actionTemplateId: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'waitDays', label: 'Wait Days', type: 'number', voice: false, required: false },
  {
    name: 'actionTemplateId',
    label: 'Action Template Id',
    type: 'text',
    voice: false,
    required: false,
  },
]

export function UpdateAutomationPage() {
  const { automationId } = useParams<{ automationId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useAutomation(automationId!)
  const mutation = useUpdateAutomation()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Automation</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ automationId: automationId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
