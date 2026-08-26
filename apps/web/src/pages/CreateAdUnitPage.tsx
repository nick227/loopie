import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateAdUnit } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  campaignId: z.string(),
  creativeId: z.string(),
  format: z.enum(['DISPLAY_BANNER', 'NATIVE', 'EMBED']),
  destinationLandingPageId: z.string().optional().or(z.literal('')),
  destinationUrl: z.string().url().optional().or(z.literal('')),
  servingConfig: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'campaignId', label: 'Campaign Id', type: 'text', voice: false, required: true },
  { name: 'creativeId', label: 'Creative Id', type: 'text', voice: false, required: true },
  { name: 'format', label: 'Format', type: 'select', voice: false, required: true, options: ['DISPLAY_BANNER', 'NATIVE', 'EMBED'] },
  { name: 'destinationLandingPageId', label: 'Destination Landing Page Id', type: 'text', voice: false, required: false },
  { name: 'destinationUrl', label: 'Destination Url', type: 'url', voice: false, required: false },
  { name: 'servingConfig', label: 'Serving Config', type: 'json', voice: false, required: false },
]

export function CreateAdUnitPage() {
  const navigate = useNavigate()
  const mutation = useCreateAdUnit()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Ad Unit</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Ad Unit"
      />
    </div>
  )
}
