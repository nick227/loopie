import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useLead, useUpdateLead } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  stage: z.enum(['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
  owner: z.string().optional().or(z.literal('')),
  estimatedValue: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  {
    name: 'stage',
    label: 'Stage',
    type: 'select',
    voice: false,
    required: false,
    options: ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'],
  },
  { name: 'owner', label: 'Owner', type: 'text', voice: false, required: false },
  {
    name: 'estimatedValue',
    label: 'Estimated Value',
    type: 'number',
    voice: false,
    required: false,
  },
]

export function UpdateLeadPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useLead(leadId!)
  const mutation = useUpdateLead()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Lead</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ leadId: leadId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
