import type { FormFieldType } from '@prisma/client'

export const CONTACT_FORM_FIELDS: {
  label: string
  fieldKey: string
  type: FormFieldType
  required: boolean
  order: number
}[] = [
  { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
  { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
]
