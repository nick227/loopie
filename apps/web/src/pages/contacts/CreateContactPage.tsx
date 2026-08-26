import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useCreateContact } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { contactBaseSchema, contactFields } from './contact-form'

type FormData = z.infer<typeof contactBaseSchema>

export function CreateContactPage() {
  const navigate = useNavigate()
  const mutation = useCreateContact()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Contact</h1>
      <Form<FormData>
        fields={contactFields}
        schema={contactBaseSchema}
        onSubmit={async (data) => {
          const result = await mutation.mutateAsync(data)
          navigate(`/contacts/${result.data!.id}`)
        }}
        isLoading={mutation.isPending}
        submitLabel="Create Contact"
      />
    </div>
  )
}
