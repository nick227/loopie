import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useImportContacts } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'
import { CrmNav } from '@/pages/crm/CrmNav'

const schema = z.object({
  contacts: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return v
      if (v.trim() === '') return undefined
      try {
        return JSON.parse(v)
      } catch {
        return v
      }
    },
    z.array(
      z.object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.string().optional(),
        tags: z.array(z.string()).optional(),
        emailEligible: z.boolean().optional(),
        smsEligible: z.boolean().optional(),
      }),
    ),
  ),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'contacts', label: 'Contacts', type: 'json', voice: false, required: true },
]

export function ImportContactsPage() {
  const navigate = useNavigate()
  const mutation = useImportContacts()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV import writes the same graph as HubSpot or Shopify — no duplicate people.
        </p>
      </div>
      <CrmNav />
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Import Contacts"
      />
    </div>
  )
}
