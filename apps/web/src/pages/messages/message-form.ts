import { z } from 'zod'
import type { FieldConfig } from '@/components/ui/Form'

export const messageBaseSchema = z.object({
  channel: z.enum(['EMAIL', 'TEXT', 'SOCIAL']),
  subject: z.string().optional().or(z.literal('')),
  body: z.string().min(1),
  audienceId: z.string(),
  templateId: z.string().optional().or(z.literal('')),
  automationId: z.string().optional().or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
})

export const messageUpdateSchema = messageBaseSchema
  .pick({
    subject: true,
    body: true,
    audienceId: true,
    scheduledAt: true,
  })
  .partial()

export const messageFields: FieldConfig[] = [
  {
    name: 'channel',
    label: 'Channel',
    type: 'select',
    voice: false,
    required: true,
    options: ['EMAIL', 'TEXT', 'SOCIAL'],
  },
  { name: 'subject', label: 'Subject', type: 'text', voice: false, required: false },
  { name: 'body', label: 'Body', type: 'textarea', voice: true, required: true, rows: 4 },
  { name: 'audienceId', label: 'Audience Id', type: 'text', voice: false, required: true },
  { name: 'templateId', label: 'Template Id', type: 'text', voice: false, required: false },
  { name: 'automationId', label: 'Automation Id', type: 'text', voice: false, required: false },
  { name: 'scheduledAt', label: 'Scheduled At', type: 'text', voice: false, required: false },
]

export const messageUpdateFields: FieldConfig[] = [
  { name: 'subject', label: 'Subject', type: 'text', voice: false, required: false },
  { name: 'body', label: 'Body', type: 'textarea', voice: true, required: false, rows: 4 },
  { name: 'audienceId', label: 'Audience Id', type: 'text', voice: false, required: false },
  { name: 'scheduledAt', label: 'Scheduled At', type: 'text', voice: false, required: false },
]
