import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAdUnit, useUpdateAdUnit } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
  destinationLandingPageId: z.string().optional().or(z.literal('')),
  destinationUrl: z.string().url().optional().or(z.literal('')),
  servingConfig: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.record(z.string(), z.unknown())).optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'status', label: 'Status', type: 'select', voice: false, required: false, options: ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'] },
  { name: 'destinationLandingPageId', label: 'Destination Landing Page Id', type: 'text', voice: false, required: false },
  { name: 'destinationUrl', label: 'Destination Url', type: 'url', voice: false, required: false },
  { name: 'servingConfig', label: 'Serving Config', type: 'json', voice: false, required: false },
]

export function UpdateAdUnitPage() {
  const { adUnitId } = useParams<{ adUnitId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useAdUnit(adUnitId!)
  const mutation = useUpdateAdUnit()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Ad Unit</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ adUnitId: adUnitId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
