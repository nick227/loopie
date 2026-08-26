import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type FormFieldInput = {
  label: string
  fieldKey: string
  type: 'TEXT' | 'EMAIL' | 'PHONE' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'HIDDEN'
  required?: boolean
  options?: string[]
  order?: number
}

type CreateFormInput = {
  name: string
  submitLabel?: string
  successMessage?: string
  fields: FormFieldInput[]
}

type UpdateFormInput = {
  formId: string
  name?: string
  submitLabel?: string
  successMessage?: string | null
  fields?: FormFieldInput[]
}

export function useForms(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['forms', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/forms', { params: { query: { ...params, cursor: pageParam } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useForm(formId: string) {
  return useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/forms/{formId}', { params: { path: { formId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!formId,
  })
}

// Same openapi-typescript quirk as useContacts.ts: fields required to be `required: boolean`
// and `order: number` (no `?`) in the generated request type, despite both having a schema
// default. Fill them in here so callers can omit them.
function withFieldDefaults(fields: FormFieldInput[]) {
  return fields.map((f, index) => ({ ...f, required: f.required ?? false, order: f.order ?? index }))
}

export function useCreateForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateFormInput) => {
      const client = getApiClient()
      const result = await client.POST('/forms', { body: { ...body, fields: withFieldDefaults(body.fields) } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms', 'list'] }),
  })
}

export function useUpdateForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ formId, ...body }: UpdateFormInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/forms/{formId}', {
        params: { path: { formId } },
        body: { ...body, fields: body.fields ? withFieldDefaults(body.fields) : undefined },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forms', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['form', variables.formId] })
    },
  })
}

export function useDeleteForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/forms/{formId}', { params: { path: { formId } } })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms', 'list'] }),
  })
}
