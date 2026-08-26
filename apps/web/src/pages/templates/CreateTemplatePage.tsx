import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateTemplate } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(150),
  channel: z.enum(['EMAIL', 'TEXT', 'SOCIAL']),
  purpose: z.string().optional().or(z.literal('')),
  subject: z.string().optional().or(z.literal('')),
  body: z.string().min(1),
  mediaAssetId: z.string().optional().or(z.literal('')),
  cta: z.string().optional().or(z.literal('')),
  personalizationTokens: z
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
  suggestedAudienceId: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  {
    name: 'channel',
    label: 'Channel',
    type: 'select',
    voice: false,
    required: true,
    options: ['EMAIL', 'TEXT', 'SOCIAL'],
  },
  { name: 'purpose', label: 'Purpose', type: 'text', voice: false, required: false },
  { name: 'subject', label: 'Subject', type: 'text', voice: false, required: false },
  { name: 'body', label: 'Body', type: 'textarea', voice: true, required: true, rows: 4 },
  { name: 'mediaAssetId', label: 'Media Asset Id', type: 'text', voice: false, required: false },
  { name: 'cta', label: 'Cta', type: 'text', voice: false, required: false },
  {
    name: 'personalizationTokens',
    label: 'Personalization Tokens',
    type: 'tags',
    voice: false,
    required: false,
  },
  {
    name: 'suggestedAudienceId',
    label: 'Suggested Audience Id',
    type: 'text',
    voice: false,
    required: false,
  },
]

export function CreateTemplatePage() {
  const navigate = useNavigate()
  const mutation = useCreateTemplate()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Template</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync(data)
          navigate(`/templates/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Template"
      />
    </div>
  )
}
