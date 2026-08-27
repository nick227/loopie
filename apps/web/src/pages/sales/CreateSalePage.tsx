import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { z } from 'zod'
import { useCreateSale } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  contactId: z.string(),
  leadId: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().min(0),
  date: z.string(),
  productOrService: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'contactId', label: 'Contact Id', type: 'text', voice: false, required: true },
  { name: 'leadId', label: 'Lead Id', type: 'text', voice: false, required: false },
  { name: 'amount', label: 'Amount', type: 'number', voice: false, required: true },
  { name: 'date', label: 'Date', type: 'text', voice: false, required: true },
  {
    name: 'productOrService',
    label: 'Product Or Service',
    type: 'text',
    voice: false,
    required: false,
  },
  { name: 'notes', label: 'Notes', type: 'textarea', voice: true, required: false, rows: 4 },
]

export function CreateSalePage() {
  const navigate = useNavigate()
  const mutation = useCreateSale()
  // Generated once per mount, resent unchanged on every submit attempt (including a retry after
  // a failed request or a double-click) so the backend's idempotency check can tell "the same
  // sale, submitted twice" from "a second, different sale" — never a user-facing field.
  const idempotencyKey = useRef(crypto.randomUUID())

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Sale</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync({
            ...data,
            idempotencyKey: idempotencyKey.current,
          })
          navigate(`/sales/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Sale"
      />
    </div>
  )
}
