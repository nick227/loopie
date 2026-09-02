import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type UpdateLeadInput = {
  leadId: string
  stage?: 'NEW' | 'CONTACTED' | 'ENGAGED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'
  owner?: string | null
  estimatedValue?: number | null
  nextActionNote?: string | null
  nextActionAt?: string | null
}

export function useLeads(params?: { stage?: string; sourceType?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['leads', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/leads', {
        params: { query: { ...params, cursor: pageParam } as any },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

// The morning work queue — every open lead, bucketed (NEW/NEVER_CONTACTED/NEEDS_FOLLOW_UP/
// OVERDUE/ENGAGED). Not paginated (bounded operational list, see LeadService.queue's QUEUE_CAP).
export function useLeadQueue() {
  return useQuery({
    queryKey: ['leads', 'queue'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/leads/queue')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

// Management-facing analytics — time-to-first-contact, touches-before-conversion, channel mix,
// overdue rate, stage funnel. Computed all-time, no date-range filter (see LeadInsights).
export function useLeadInsights() {
  return useQuery({
    queryKey: ['leads', 'insights'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/leads/insights')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

export function useLead(leadId: string) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/leads/{leadId}', { params: { path: { leadId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!leadId,
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, ...body }: UpdateLeadInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/leads/{leadId}', { params: { path: { leadId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['leads', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] })
      // The lead card lives on GET /contacts/{id} (currentLead) — no contactId in scope here, so
      // invalidate broadly, same as useUpdateContactTag's rename-propagation case.
      queryClient.invalidateQueries({ queryKey: ['contact'] })
    },
  })
}

// The one write path onto Interaction that isn't a system-of-record event — a salesperson
// manually logging a call, meeting, webinar/event, follow-up, or plain note.
export function useLogContactActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      contactId,
      ...body
    }: {
      contactId: string
      type: 'CALL_LOGGED' | 'MEETING' | 'WEBINAR' | 'EVENT' | 'FOLLOW_UP' | 'NOTE'
      channel?:
        'EMAIL' | 'TEXT' | 'SOCIAL' | 'CALL' | 'MEETING' | 'WEBINAR' | 'EVENT' | 'FORM' | 'REFERRAL'
      providerId?: string
      providerName?: string
      note?: string
      occurredAt?: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/contacts/{contactId}/interactions', {
        params: { path: { contactId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId, 'interactions'] })
      queryClient.invalidateQueries({ queryKey: ['leads', 'queue'] })
    },
  })
}
