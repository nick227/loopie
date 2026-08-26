import { useParams, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useContact, useUpdateContact } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Skeleton'
import { contactUpdateSchema, contactFields } from './contact-form'

type FormData = z.infer<typeof contactUpdateSchema>

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
        fields={contactFields}
        schema={contactUpdateSchema}
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
