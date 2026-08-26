import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateCampaign } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const PLATFORMS = ['META', 'GOOGLE', 'TIKTOK', 'LOOPIE'] as const
const BUDGETS = ['0', '500', '2500'] as const

const schema = z.object({
  name: z.string().min(1).max(150),
  budget: z.enum(BUDGETS),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  destinationUrl: z.string().url().optional().or(z.literal('')),
  platforms: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.enum(PLATFORMS))),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  {
    name: 'platforms',
    label: 'Platforms',
    type: 'checkboxes',
    voice: false,
    required: false,
    options: [...PLATFORMS],
    optionLabels: ['Meta', 'Google', 'TikTok', 'LOOPIE'],
  },
  {
    name: 'budget',
    label: 'Budget',
    type: 'radio',
    voice: false,
    required: false,
    options: [...BUDGETS],
    optionLabels: ['$0', '$500', '$2,500'],
  },
  { name: 'startDate', label: 'Start Date', type: 'date', voice: false, required: false },
  { name: 'endDate', label: 'End Date', type: 'date', voice: false, required: false },
  { name: 'destinationUrl', label: 'Destination Url', type: 'url', voice: false, required: false },
]

function toDateTime(date: string | undefined) {
  if (!date) return undefined
  return new Date(`${date}T00:00:00`).toISOString()
}

export function CreateCampaignPage() {
  const navigate = useNavigate()
  const mutation = useCreateCampaign()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Campaign</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={{ budget: '0' }}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync({
            name: data.name,
            budget: Number(data.budget),
            startDate: toDateTime(data.startDate),
            endDate: toDateTime(data.endDate),
            destinationUrl: data.destinationUrl,
            platforms: data.platforms,
          })
          navigate(`/campaigns/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Campaign"
      />
    </div>
  )
}
