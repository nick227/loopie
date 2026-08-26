import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useImportContacts } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  contacts: z.preprocess((v) => { if (typeof v !== 'string') return v; if (v.trim() === '') return undefined; try { return JSON.parse(v) } catch { return v } }, z.array(z.record(z.string(), z.unknown()))),
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
      <h1 className="text-xl font-semibold">New Import Contacts</h1>
      <Form<FormData>
        fields={fields}
        schema={schema}
        onSubmit={async (data) => {
          await mutation.mutateAsync(data as any)
          navigate(-1)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Import Contacts"
      />
    </div>
  )
}
