import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateMessage } from '@project/sdk'
import { messageBaseSchema, type MessageFormData } from './message-form'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { RecipientSelector } from '@/components/ui/RecipientSelector'
import { Mail, MessageSquare, Globe, Image as ImageIcon } from 'lucide-react'

export function CreateMessagePage() {
  const navigate = useNavigate()
  const mutation = useCreateMessage()

  const {
    register,
    control,
    setValue,
    formState: { isValid, errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageBaseSchema),
    defaultValues: {
      channel: 'EMAIL',
      subject: '',
      body: '',
      contactIds: [],
      audienceIds: [],
      rawEmails: [],
      platforms: [],
      testEmail: '',
    },
    mode: 'onChange',
  })

  const channel = useWatch({ control, name: 'channel' })
  const body = useWatch({ control, name: 'body' })
  const subject = useWatch({ control, name: 'subject' }) // Only for EMAIL
  const testEmail = useWatch({ control, name: 'testEmail' }) // Only for EMAIL
  const contactIds = useWatch({ control, name: 'contactIds' })
  const audienceIds = useWatch({ control, name: 'audienceIds' })
  const rawEmails = useWatch({ control, name: 'rawEmails' })
  const platforms = useWatch({ control, name: 'platforms' })

  // Need to force TS to know we are in specific discriminated states for TS-safe reads
  const isEmail = channel === 'EMAIL'
  const isSms = channel === 'SMS'
  const isSocial = channel === 'SOCIAL'

  const canSend = isValid && body && body.length > 0

  // Suggested chips based on active channel (mock IDs)
  const suggestedChips: { id: string; name: string; type: 'audience' | 'platform' }[] = isSocial
    ? [
        { id: 'facebook_page', name: 'Facebook Page', type: 'platform' },
        { id: 'linkedin_profile', name: 'LinkedIn Profile', type: 'platform' },
      ]
    : [
        { id: 'website_capture', name: 'Website Capture Forms', type: 'audience' },
        { id: 'active_customers', name: 'Active Customers (Segment)', type: 'audience' },
      ]

  return (
    <div className="mx-auto max-w-3xl flex flex-col space-y-6 pb-12 h-screen max-h-screen overflow-hidden">
      <div className="flex items-center justify-between border-b pb-4 mt-6 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">New Message</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={!canSend}>
            Schedule
          </Button>
          <Button disabled={!canSend}>Send Message</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col space-y-6 pb-12">
          {/* Channel Selector */}
          <div className="flex space-x-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setValue('channel', 'EMAIL')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${channel === 'EMAIL' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}
            >
              <Mail size={16} /> Email
            </button>
            <button
              type="button"
              onClick={() => setValue('channel', 'SMS')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${channel === 'SMS' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}
            >
              <MessageSquare size={16} /> SMS
            </button>
            <button
              type="button"
              onClick={() => setValue('channel', 'SOCIAL')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${channel === 'SOCIAL' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}
            >
              <Globe size={16} /> Social
            </button>
          </div>

          {/* Dynamic Form Sections */}
          <section className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
            {/* Unified To Field */}
            <div className="space-y-2">
              <RecipientSelector
                selectedContactIds={contactIds || []}
                selectedAudienceIds={audienceIds || []}
                selectedRawEmails={rawEmails || []}
                suggestedChips={suggestedChips}
                onChange={(contacts, audiences, rawEmails, platforms) => {
                  setValue('contactIds', contacts, { shouldValidate: true })
                  setValue('audienceIds', audiences, { shouldValidate: true })
                  setValue('rawEmails', rawEmails, { shouldValidate: true })
                  if (isSocial) {
                    setValue('platforms', platforms, { shouldValidate: true })
                  }
                }}
              />
            </div>

            {isEmail && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input {...register('subject')} placeholder="Message subject..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">HTML Template</label>
                  <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Plain Text</option>
                    <option value="newsletter">Newsletter (Stylish)</option>
                    <option value="sale">Sale Announcement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Body *</label>
                  <Textarea
                    {...register('body')}
                    placeholder="Type your email here..."
                    className="min-h-[250px] resize-y"
                  />
                </div>
              </>
            )}

            {isSms && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Text Message *</label>
                    <span
                      className={`text-xs ${body && body.length > 160 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
                    >
                      {body ? body.length : 0} / 160 chars
                    </span>
                  </div>
                  <Textarea
                    {...register('body')}
                    placeholder="Type your SMS here..."
                    className="min-h-[120px] resize-y"
                  />
                </div>
              </>
            )}

            {isSocial && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Media Asset *</label>
                  <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                    <ImageIcon size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Click to upload or drag & drop</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Caption *</label>
                  <Textarea
                    {...register('body')}
                    placeholder="Write a caption..."
                    className="min-h-[150px] resize-y"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
