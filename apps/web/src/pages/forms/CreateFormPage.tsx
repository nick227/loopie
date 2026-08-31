import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCreateForm } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  FormFieldsEditor,
  emptyField,
  type FormFieldDraft,
} from '@/components/forms/FormFieldsEditor'

export function CreateFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Landing Page editor links here with ?returnTo=/landing-pages/{id} so a form created inline
  // as part of authoring a page comes back to that page instead of wherever "back" would go.
  const returnTo = searchParams.get('returnTo')

  const [name, setName] = useState('')
  const [submitLabel, setSubmitLabel] = useState('Submit')
  const [successMessage, setSuccessMessage] = useState('')
  const [fields, setFields] = useState<FormFieldDraft[]>([emptyField()])
  const [error, setError] = useState<string | null>(null)

  const mutation = useCreateForm()

  async function handleSubmit() {
    setError(null)
    const cleanFields = fields.filter((f) => f.label.trim() && f.fieldKey.trim())
    if (!name.trim()) return setError('Name is required.')
    if (cleanFields.length === 0) return setError('Add at least one field.')

    const result = await mutation.mutateAsync({
      name,
      submitLabel: submitLabel || undefined,
      successMessage: successMessage || undefined,
      fields: cleanFields.map((f) => ({
        label: f.label,
        fieldKey: f.fieldKey,
        type: f.type,
        required: f.required,
        options:
          f.type === 'SELECT'
            ? f.options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
      })),
    })

    navigate(returnTo ? `${returnTo}?formId=${result.data!.id}` : `/forms/${result.data!.id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader variant="editor" title="New Form" />
      <Card>
        <CardContent className="py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Book a Detail"
              voice
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Submit button label</label>
            <Input value={submitLabel} onChange={(e) => setSubmitLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Success message</label>
            <Textarea
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              rows={2}
              voice
              placeholder="Thanks — we'll be in touch shortly."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Fields</label>
            <FormFieldsEditor fields={fields} onChange={setFields} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} loading={mutation.isPending} className="self-start">
            Create Form
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
