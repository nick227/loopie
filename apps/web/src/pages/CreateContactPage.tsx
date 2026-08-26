import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateContact } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  tags: z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v), z.array(z.string())).optional(),
  emailEligible: z.boolean().optional(),
  smsEligible: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'email', label: 'Email', type: 'email', voice: false, required: false },
  { name: 'phone', label: 'Phone', type: 'tel', voice: false, required: false },
  { name: 'company', label: 'Company', type: 'text', voice: false, required: false },
  { name: 'source', label: 'Source', type: 'text', voice: false, required: false },
  { name: 'tags', label: 'Tags', type: 'tags', voice: false, required: false },
  { name: 'emailEligible', label: 'Email Eligible', type: 'checkbox', voice: false, required: false },
  { name: 'smsEligible', label: 'Sms Eligible', type: 'checkbox', voice: false, required: false },
]

export function CreateContactPage() {
  const navigate = useNavigate()
  const mutation = useCreateContact()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Contact</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Contact"
      />
    </div>
  )
}
