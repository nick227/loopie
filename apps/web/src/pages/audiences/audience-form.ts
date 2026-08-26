import { z } from 'zod'
import type { FieldConfig } from '@/components/ui/Form'

export const audienceBaseSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['SAVED_FILTER', 'MANUAL_LIST', 'IMPORTED_LIST']),
  filter: z
    .preprocess(
      (v) => {
        if (typeof v !== 'string') return v
        if (v.trim() === '') return undefined
        try {
          return JSON.parse(v)
        } catch {
          return v
        }
      },
      z.record(z.string(), z.unknown()),
    )
    .optional(),
  contactIds: z
    .preprocess(
      (v) =>
        typeof v === 'string'
          ? v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : v,
      z.array(z.string()),
    )
    .optional(),
})

export const audienceUpdateSchema = audienceBaseSchema.pick({ name: true, filter: true }).partial()

export const audienceFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    voice: false,
    required: true,
    options: ['SAVED_FILTER', 'MANUAL_LIST', 'IMPORTED_LIST'],
  },
  { name: 'filter', label: 'Filter', type: 'json', voice: false, required: false },
  { name: 'contactIds', label: 'Contact Ids', type: 'tags', voice: false, required: false },
]

export const audienceUpdateFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: false },
  { name: 'filter', label: 'Filter', type: 'json', voice: false, required: false },
]
