import { useState } from 'react'
import { useUpdateBusiness } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type FieldSpec = { name: string; label: string; type: string; required: boolean }

export function AssistantBusinessInfoStep({
  fields,
  onDone,
}: {
  fields: FieldSpec[]
  onDone: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const updateBusiness = useUpdateBusiness()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await updateBusiness.mutateAsync(values)
    onDone()
  }

  const canSubmit = fields.every((f) => !f.required || !!values[f.name]?.trim())

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label
            htmlFor={`assistant-${field.name}`}
            className="text-xs font-medium text-muted-foreground"
          >
            {field.label}
          </label>
          <Input
            id={`assistant-${field.name}`}
            value={values[field.name] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
            required={field.required}
          />
        </div>
      ))}
      <Button
        type="submit"
        size="sm"
        loading={updateBusiness.isPending}
        disabled={!canSubmit}
        className="w-full"
      >
        Continue
      </Button>
    </form>
  )
}
