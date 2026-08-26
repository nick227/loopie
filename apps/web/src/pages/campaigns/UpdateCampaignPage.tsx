import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCampaign, useUpdateCampaign } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().optional().or(z.literal('')),
  budget: z.coerce.number().min(0).optional(),
  endDate: z.string().optional().or(z.literal('')),
  destinationUrl: z.string().url().optional().or(z.literal('')),
  creativeIds: z
    .preprocess(
      (v) =>
        typeof v === 'string'
          ? v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : v,
      z.array(z.string()),
    )
    .optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'budget', label: 'Budget', type: 'number', voice: false, required: false },
  { name: 'endDate', label: 'End Date', type: 'text', voice: false, required: false },
  { name: 'destinationUrl', label: 'Destination Url', type: 'url', voice: false, required: false },
  { name: 'creativeIds', label: 'Creative Ids', type: 'tags', voice: false, required: false },
]

export function UpdateCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useCampaign(campaignId!)
  const mutation = useUpdateCampaign()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Campaign</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ campaignId: campaignId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
