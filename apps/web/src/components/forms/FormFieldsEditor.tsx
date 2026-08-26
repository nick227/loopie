import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export type FormFieldDraft = {
  label: string
  fieldKey: string
  type: 'TEXT' | 'EMAIL' | 'PHONE' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'HIDDEN'
  required: boolean
  options: string
}

const FIELD_TYPES: FormFieldDraft['type'][] = [
  'TEXT',
  'EMAIL',
  'PHONE',
  'TEXTAREA',
  'SELECT',
  'CHECKBOX',
  'HIDDEN',
]

export function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function emptyField(): FormFieldDraft {
  return { label: '', fieldKey: '', type: 'TEXT', required: false, options: '' }
}

interface FormFieldsEditorProps {
  fields: FormFieldDraft[]
  onChange: (fields: FormFieldDraft[]) => void
}

// A Form's fields are a required, ordered, nested-object array — CreateFormInput/UpdateFormInput
// can't be represented by the generic generated Zod form (see CLAUDE.md's Known Gap notes on
// buildZodExpr's 'json' fallback), so this is real, hand-built UI rather than a JSON textarea.
export function FormFieldsEditor({ fields, onChange }: FormFieldsEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  function update(index: number, patch: Partial<FormFieldDraft>) {
    const next = fields.slice()
    const current = next[index]
    if (!current) return
    const updated = { ...current, ...patch }
    // Keep fieldKey in sync with the label until the author deliberately edits fieldKey by hand.
    if (patch.label !== undefined && current.fieldKey === toFieldKey(current.label)) {
      updated.fieldKey = toFieldKey(patch.label)
    }
    next[index] = updated
    onChange(next)
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...fields, emptyField()])
  }

  function handleDragStart(index: number, e: React.DragEvent) {
    // Required for Firefox
    e.dataTransfer.setData('text/plain', index.toString())
    setDraggedIndex(index)
  }

  function handleDragEnter(index: number, e: React.DragEvent) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const next = [...fields]
    const [removed] = next.splice(draggedIndex, 1)
    next.splice(index, 0, removed as FormFieldDraft)
    onChange(next)
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault() // Necessary to allow dropping
  }

  function handleDragEnd() {
    setDraggedIndex(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div
          key={field.fieldKey + index} // Better key to handle reordering
          draggable
          onDragStart={(e) => handleDragStart(index, e)}
          onDragEnter={(e) => handleDragEnter(index, e)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          className={cn(
            'rounded border border-input-border p-3 flex flex-col gap-2 transition-opacity',
            draggedIndex === index ? 'opacity-50' : 'opacity-100',
          )}
        >
          <div className="flex items-start gap-2">
            <GripVertical
              size={16}
              className="mt-2.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
            />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Label</label>
                <Input
                  value={field.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder="e.g. Phone Number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Field key</label>
                <Input
                  value={field.fieldKey}
                  onChange={(e) => update(index, { fieldKey: toFieldKey(e.target.value) })}
                  placeholder="phone_number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  value={field.type}
                  onChange={(e) =>
                    update(index, { type: e.target.value as FormFieldDraft['type'] })
                  }
                  className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {field.type === 'SELECT' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Options (comma-separated)</label>
                  <Input
                    value={field.options}
                    onChange={(e) => update(index, { options: e.target.value })}
                    placeholder="Small, Medium, Large"
                  />
                </div>
              )}
              <label
                className={cn(
                  'flex items-center gap-2 text-sm',
                  field.type === 'SELECT' ? 'col-span-2' : '',
                )}
              >
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => update(index, { required: e.target.checked })}
                  className="h-4 w-4 rounded border-input-border"
                />
                Required
              </label>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-muted-foreground hover:text-destructive transition-colors mt-2.5"
              aria-label="Remove field"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus size={14} /> Add field
      </Button>
    </div>
  )
}
