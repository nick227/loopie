import type { FormFieldType } from '@prisma/client'

type SeedField = {
  label: string
  fieldKey: string
  type: FormFieldType
  required: boolean
  order: number
}

export const CONTACT_FORM_FIELDS: SeedField[] = [
  { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
  { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
]

export const EMAIL_CAPTURE_FIELDS: SeedField[] = [
  { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 },
]
