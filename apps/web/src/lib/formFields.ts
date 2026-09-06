import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'

export function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function emptyField(): FormFieldDraft {
  return { label: '', fieldKey: '', type: 'TEXT', required: false, options: '', defaultValue: '' }
}
