import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useContact, useUpdateContact } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  name: z.string().min(1).max(200).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  tags: z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v), z.array(z.string())).optional(),
  emailEligible: z.boolean().optional(),
  smsEligible: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'email', label: 'Email', type: 'email', voice: false, required: false },
  { name: 'phone', label: 'Phone', type: 'tel', voice: false, required: false },
  { name: 'company', label: 'Company', type: 'text', voice: false, required: false },
  { name: 'tags', label: 'Tags', type: 'tags', voice: false, required: false },
  { name: 'emailEligible', label: 'Email Eligible', type: 'checkbox', voice: false, required: false },
  { name: 'smsEligible', label: 'Sms Eligible', type: 'checkbox', voice: false, required: false },
]

export function UpdateContactPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useContact(contactId!)
  const mutation = useUpdateContact()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Contact</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        defaultValues={data?.data as Partial<FormData>}
        onSubmit={async (formData) => {
          await mutation.mutateAsync({ contactId: contactId!, ...formData })
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )
}
