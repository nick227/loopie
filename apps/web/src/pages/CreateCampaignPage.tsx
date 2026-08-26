import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateCampaign } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150),
  budget: z.coerce.number().min(0),
  startDate: z.string(),
  endDate: z.string().optional().or(z.literal('')),
  destinationUrl: z.string().url().optional().or(z.literal('')),
  platforms: z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v), z.array(z.enum(['META', 'GOOGLE', 'TIKTOK']))),
  creativeIds: z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v), z.array(z.string())),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'budget', label: 'Budget', type: 'number', voice: false, required: true },
  { name: 'startDate', label: 'Start Date', type: 'text', voice: false, required: true },
  { name: 'endDate', label: 'End Date', type: 'text', voice: false, required: false },
  { name: 'destinationUrl', label: 'Destination Url', type: 'url', voice: false, required: false },
  { name: 'platforms', label: 'Platforms', type: 'tags', voice: false, required: true, options: ['META', 'GOOGLE', 'TIKTOK'] },
  { name: 'creativeIds', label: 'Creative Ids', type: 'tags', voice: false, required: true },
]

export function CreateCampaignPage() {
  const navigate = useNavigate()
  const mutation = useCreateCampaign()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Campaign</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Campaign"
      />
    </div>
  )
}
