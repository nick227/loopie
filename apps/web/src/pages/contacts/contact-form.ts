import { z } from 'zod'
import type { FieldConfig } from '@/components/ui/Form'

export const contactBaseSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  tags: z
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
  emailEligible: z.boolean().optional(),
  smsEligible: z.boolean().optional(),
})

export const contactUpdateSchema = contactBaseSchema.partial()

export const contactFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', voice: true, required: true },
  { name: 'email', label: 'Email', type: 'email', voice: false, required: false },
  { name: 'phone', label: 'Phone', type: 'tel', voice: false, required: false },
  { name: 'company', label: 'Company', type: 'text', voice: false, required: false },
  { name: 'source', label: 'Source', type: 'text', voice: false, required: false },
  { name: 'tags', label: 'Tags', type: 'tags', voice: false, required: false },
  {
    name: 'emailEligible',
    label: 'Email Eligible',
    type: 'checkbox',
    voice: false,
    required: false,
  },
  { name: 'smsEligible', label: 'Sms Eligible', type: 'checkbox', voice: false, required: false },
]
