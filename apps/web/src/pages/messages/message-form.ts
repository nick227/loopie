import { z } from 'zod'
import type { FieldConfig } from '@/components/ui/Form'

export const messageBaseSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('EMAIL'),
    subject: z.string().min(1, 'Subject is required'),
    body: z.string().min(1, 'Body is required'),
    templateId: z.string().optional(),
    contactIds: z.array(z.string()).default([]),
    audienceIds: z.array(z.string()).default([]),
    rawEmails: z.array(z.string().email()).default([]),
    testEmail: z.string().email().optional().or(z.literal('')),
  }),
  z.object({
    channel: z.literal('SMS'),
    body: z.string().min(1, 'Body is required').max(160, 'SMS must be 160 characters or less'),
    contactIds: z.array(z.string()).default([]),
    audienceIds: z.array(z.string()).default([]),
    rawEmails: z.array(z.string().email()).default([]),
  }),
  z.object({
    channel: z.literal('SOCIAL'),
    body: z.string().min(1, 'Caption is required'),
    mediaUrls: z.array(z.string()).default([]), // For POC
    platforms: z.array(z.string()).default([]),
    contactIds: z.array(z.string()).default([]),
    audienceIds: z.array(z.string()).default([]),
    rawEmails: z.array(z.string().email()).default([]),
  }),
])

export type MessageFormData = z.infer<typeof messageBaseSchema>

export const messageUpdateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1, 'Body is required'),
  audienceId: z.string().optional(),
})

export const messageUpdateFields: FieldConfig[] = [
  { name: 'subject', label: 'Subject', type: 'text' },
  { name: 'body', label: 'Body', type: 'textarea' },
]
