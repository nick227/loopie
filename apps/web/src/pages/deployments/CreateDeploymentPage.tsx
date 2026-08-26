import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateDeployment } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  creativeId: z.string(),
  platform: z.enum(['META', 'GOOGLE', 'TIKTOK']),
  externalCampaignId: z.string().optional().or(z.literal('')),
  externalAdSetId: z.string().optional().or(z.literal('')),
  externalAdId: z.string().optional().or(z.literal('')),
  destinationLandingPageId: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'creativeId', label: 'Creative Id', type: 'text', voice: false, required: true },
  {
    name: 'platform',
    label: 'Platform',
    type: 'select',
    voice: false,
    required: true,
    options: ['META', 'GOOGLE', 'TIKTOK'],
  },
  {
    name: 'externalCampaignId',
    label: 'External Campaign Id',
    type: 'text',
    voice: false,
    required: false,
  },
  {
    name: 'externalAdSetId',
    label: 'External Ad Set Id',
    type: 'text',
    voice: false,
    required: false,
  },
  { name: 'externalAdId', label: 'External Ad Id', type: 'text', voice: false, required: false },
  {
    name: 'destinationLandingPageId',
    label: 'Destination Landing Page Id',
    type: 'text',
    voice: false,
    required: false,
  },
]

export function CreateDeploymentPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const mutation = useCreateDeployment()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Deployment</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync({ campaignId: campaignId!, ...data })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Deployment"
      />
    </div>
  )
}
