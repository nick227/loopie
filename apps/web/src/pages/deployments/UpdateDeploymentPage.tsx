import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useDeployment, useUpdateDeployment } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
  spend: z.coerce.number().min(0).optional(),
  impressions: z.coerce.number().min(0).optional(),
  clicks: z.coerce.number().min(0).optional(),
  conversions: z.coerce.number().min(0).optional(),
  destinationLandingPageId: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    voice: false,
    required: false,
    options: ['PENDING', 'ACTIVE', 'PAUSED', 'ENDED'],
  },
  { name: 'spend', label: 'Spend', type: 'number', voice: false, required: false },
  { name: 'impressions', label: 'Impressions', type: 'number', voice: false, required: false },
  { name: 'clicks', label: 'Clicks', type: 'number', voice: false, required: false },
  { name: 'conversions', label: 'Conversions', type: 'number', voice: false, required: false },
  {
    name: 'destinationLandingPageId',
    label: 'Destination Landing Page Id',
    type: 'text',
    voice: false,
    required: false,
  },
]

export function UpdateDeploymentPage() {
  const { deploymentId } = useParams<{ deploymentId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useDeployment(deploymentId!)
  const mutation = useUpdateDeployment()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Deployment</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData> | undefined}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ deploymentId: deploymentId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
