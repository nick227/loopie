import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { DefaultValues, FieldValues, Path, PathValue } from 'react-hook-form'
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
    | 'date'
    | 'radio'
    | 'checkboxes'
  placeholder?: string
  description?: string
  voice?: boolean
  required?: boolean
  rows?: number
  /** Option values for 'select', 'radio', 'checkboxes', and 'tags'. */
  options?: string[]
  /** Display labels parallel to `options`. Falls back to the option value. */
  optionLabels?: string[]
}

interface FormProps<T extends FieldValues> {
  fields: FieldConfig[]
  // Output must be T; input is left as `any` rather than pinned to T (ZodSchema<T>'s default)
  // because 'tags'/'json' fields use z.preprocess, which — by design — accepts a different
  // (pre-transform) input type than its output.
  schema: ZodType<T, ZodTypeDef, unknown>
  onSubmit: (data: T) => Promise<void> | void
  submitLabel?: string
  defaultValues?: Partial<T>
  isLoading?: boolean
  className?: string
}

export function Form<T extends FieldValues>({
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
    defaultValues: defaultValues as DefaultValues<T>,
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
        const isGroup = field.type === 'radio' || field.type === 'checkboxes'
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            {isGroup ? (
              <span className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </span>
            ) : (
              <label htmlFor={id} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
            )}

            {field.type === 'textarea' || field.type === 'json' ? (
              <Textarea
                {...register(field.name as Path<T>)}
                id={id}
                placeholder={
                  field.placeholder ?? (field.type === 'json' ? '{ "key": "value" }' : undefined)
                }
                rows={field.rows ?? (field.type === 'json' ? 6 : 4)}
                voice={field.voice}
                onVoiceResult={(t) => {
                  const path = field.name as Path<T>
                  setValue(path, t as PathValue<T, typeof path>)
                }}
                className={field.type === 'json' ? 'font-mono text-sm' : ''}
              />
            ) : field.type === 'select' ? (
              <select
                {...register(field.name as Path<T>)}
                id={id}
                className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue=""
              >
                <option value="" disabled>
                  Select...
                </option>
                {field.options?.map((opt, i) => (
                  <option key={opt} value={opt}>
                    {field.optionLabels?.[i] ?? opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                {...register(field.name as Path<T>)}
                id={id}
                type="checkbox"
                className="h-4 w-4 rounded border-input-border"
              />
            ) : field.type === 'radio' ? (
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={field.label}>
                {field.options?.map((opt, i) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      {...register(field.name as Path<T>)}
                      type="radio"
                      value={opt}
                      className="h-4 w-4 border-input-border"
                    />
                    {field.optionLabels?.[i] ?? opt}
                  </label>
                ))}
              </div>
            ) : field.type === 'checkboxes' ? (
              <div className="flex flex-col gap-2">
                {field.options?.map((opt, i) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      {...register(field.name as Path<T>)}
                      type="checkbox"
                      value={opt}
                      className="h-4 w-4 rounded border-input-border"
                    />
                    {field.optionLabels?.[i] ?? opt}
                  </label>
                ))}
              </div>
            ) : (
              <Input
                {...register(field.name as Path<T>)}
                id={id}
                type={field.type === 'tags' ? 'text' : field.type}
                placeholder={
                  field.placeholder ??
                  (field.type === 'tags' ? 'comma, separated, values' : undefined)
                }
                voice={field.voice}
                onVoiceResult={(t) => {
                  const path = field.name as Path<T>
                  setValue(path, t as PathValue<T, typeof path>)
                }}
              />
            )}

            {errors[field.name] && (
              <p className="text-xs text-destructive">{errors[field.name]?.message as string}</p>
            )}
            {field.description && !errors[field.name] && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        )
      })}

      {submitError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-alert-circle"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <p>{submitError}</p>
        </div>
      )}

      <Button type="submit" loading={isSubmitting || isLoading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
