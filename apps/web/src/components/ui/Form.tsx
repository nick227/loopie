import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodType, ZodTypeDef } from 'zod'
import { Input } from './Input'
import { Textarea } from './Textarea'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export type FieldConfig = {
  name: string
  label: string
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'textarea'
    | 'url'
    | 'tel'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'tags'
    | 'json'
  placeholder?: string
  voice?: boolean
  required?: boolean
  rows?: number
  /** Option values for 'select' (single choice) and 'tags' (comma-separated, constrained to these). */
  options?: string[]
}

interface FormProps<T extends Record<string, unknown>> {
  fields: FieldConfig[]
  // Output must be T; input is left as `any` rather than pinned to T (ZodSchema<T>'s default)
  // because 'tags'/'json' fields use z.preprocess, which — by design — accepts a different
  // (pre-transform) input type than its output.
  schema: ZodType<T, ZodTypeDef, any>
  onSubmit: (data: T) => Promise<void> | void
  submitLabel?: string
  defaultValues?: Partial<T>
  isLoading?: boolean
  className?: string
}

export function Form<T extends Record<string, unknown>>({
  fields,
  schema,
  onSubmit,
  submitLabel = 'Submit',
  defaultValues,
  isLoading = false,
  className,
}: FormProps<T>) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const optionalFields = useMemo(() => {
    const set = new Set<string>()
    for (const f of fields) {
      if (!f.required) set.add(f.name)
    }
    return set
  }, [fields])

  function normalizeSubmitData(data: T) {
    return Object.fromEntries(
      Object.entries(data).filter(([key, value]) => !(optionalFields.has(key) && value === '')),
    ) as T
  }

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  })

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        setSubmitError(null)
        try {
          await onSubmit(normalizeSubmitData(data))
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Request failed')
        }
      })}
      className={cn('flex flex-col gap-4', className)}
    >
      {fields.map((field) => {
        const id = `field-${field.name}`
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </label>

            {field.type === 'textarea' || field.type === 'json' ? (
              <Textarea
                {...register(field.name as any)}
                id={id}
                placeholder={
                  field.placeholder ?? (field.type === 'json' ? '{ "key": "value" }' : undefined)
                }
                rows={field.rows ?? (field.type === 'json' ? 6 : 4)}
                voice={field.voice}
                onVoiceResult={(t) => setValue(field.name as any, t as any)}
                className={field.type === 'json' ? 'font-mono text-sm' : ''}
              />
            ) : field.type === 'select' ? (
              <select
                {...register(field.name as any)}
                id={id}
                className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue=""
              >
                <option value="" disabled>
                  Select...
                </option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                {...register(field.name as any)}
                id={id}
                type="checkbox"
                className="h-4 w-4 rounded border-input-border"
              />
            ) : (
              <Input
                {...register(field.name as any)}
                id={id}
                type={field.type === 'tags' ? 'text' : field.type}
                placeholder={
                  field.placeholder ??
                  (field.type === 'tags' ? 'comma, separated, values' : undefined)
                }
                voice={field.voice}
                onVoiceResult={(t) => setValue(field.name as any, t as any)}
              />
            )}

            {errors[field.name] && (
              <p className="text-xs text-destructive">{errors[field.name]?.message as string}</p>
            )}
          </div>
        )
      })}

      {submitError && <p className="text-xs text-destructive">{submitError}</p>}

      <Button type="submit" loading={isSubmitting || isLoading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
