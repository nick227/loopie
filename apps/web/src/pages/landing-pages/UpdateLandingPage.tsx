import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useLandingPage, useUpdateLandingPage } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150).optional().or(z.literal('')),
  slug: z.string().min(1).max(80).optional().or(z.literal('')),
  customDomain: z.string().optional().or(z.literal('')),
  formId: z.string().optional().or(z.literal('')),
  content: z
    .preprocess(
      (v) => {
        if (typeof v !== 'string') return v
        if (v.trim() === '') return undefined
        try {
          return JSON.parse(v)
        } catch {
          return v
        }
      },
      z.record(z.string(), z.unknown()),
    )
    .optional(),
  theme: z
    .preprocess(
      (v) => {
        if (typeof v !== 'string') return v
        if (v.trim() === '') return undefined
        try {
          return JSON.parse(v)
        } catch {
          return v
        }
      },
      z.record(z.string(), z.unknown()),
    )
    .optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  {
    name: 'slug',
    label: 'Page URL',
    type: 'text',
    placeholder: 'spring-detailing-promo',
    description: 'Example: your-site.com/p/spring-detailing-promo. Enter only the final part.',
    voice: false,
    required: false,
  },
  { name: 'customDomain', label: 'Custom Domain', type: 'text', voice: false, required: false },
  { name: 'formId', label: 'Form Id', type: 'text', voice: false, required: false },
  { name: 'content', label: 'Content', type: 'json', voice: false, required: false },
  { name: 'theme', label: 'Theme', type: 'json', voice: false, required: false },
]

export function UpdateLandingPage() {
  const { landingPageId } = useParams<{ landingPageId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useLandingPage(landingPageId!)
  const mutation = useUpdateLandingPage()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Landing</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ landingPageId: landingPageId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
