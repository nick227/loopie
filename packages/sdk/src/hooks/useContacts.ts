import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

// See the note at the top of useAuth.ts: never destructure { data, error, response } off an
// awaited client call, and never narrow on result.error inside an if — extract to locals first.

type CreateContactInput = {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: string
  tags?: string[]
  emailEligible?: boolean
  smsEligible?: boolean
}

type UpdateContactInput = {
  contactId: string
  name?: string
  email?: string | null
  phone?: string | null
  company?: string | null
  tags?: string[]
  emailEligible?: boolean
  smsEligible?: boolean
}

export function useContacts(params?: {
  q?: string
  tag?: string
  lifecycleStatus?: 'LEAD' | 'CUSTOMER' | 'PAST_CUSTOMER' | 'NONE'
  limit?: number
}) {
  return useInfiniteQuery({
    queryKey: ['contacts', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/contacts', {
        params: { query: { ...params, cursor: pageParam } },
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

export function useContact(contactId: string) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/contacts/{contactId}', { params: { path: { contactId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!contactId,
  })
}

export function useContactInteractions(contactId: string) {
  return useQuery({
    queryKey: ['contact', contactId, 'interactions'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/contacts/{contactId}/interactions', {
        params: { path: { contactId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!contactId,
  })
}

// openapi-typescript generates emailEligible/smsEligible as required booleans in the request
// body type (the schema's `default: true` apparently suppresses `?` rather than just filling
// the value) — default them here so callers can still omit them.
function withChannelDefaults(input: CreateContactInput) {
  return {
    ...input,
    emailEligible: input.emailEligible ?? true,
    smsEligible: input.smsEligible ?? true,
  }
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateContactInput) => {
      const client = getApiClient()
      const result = await client.POST('/contacts', { body: withChannelDefaults(body) })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] }),
  })
}

export function useImportContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      contacts: Array<{
        name: string
        email?: string
        phone?: string
        company?: string
        source?: string
        tags?: string[]
        emailEligible?: boolean
        smsEligible?: boolean
        externalId?: string
        profile?: Record<string, string>
      }>
    }) => {
      const client = getApiClient()
      const result = await client.POST('/contacts/import', {
        body: { contacts: body.contacts },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'catalog'] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contactId, ...body }: UpdateContactInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/contacts/{contactId}', {
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
      queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contactId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/contacts/{contactId}', {
        params: { path: { contactId } },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] }),
  })
}
