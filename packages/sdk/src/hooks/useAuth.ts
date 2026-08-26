import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

// NOTE ON THE ACCESS PATTERN BELOW: never destructure `{ data, error, response }`
// directly off an awaited client.METHOD(...) call, and never narrow on `result.error`
// inside an `if` (e.g. `if (result.error) use(result.response)`). Both collapse TS's
// inference to `never` under this project's TS 5.9.3 + openapi-fetch 0.12.5 combo —
// verified in isolation, unrelated to this spec. Extracting each field to its own
// local const first (as every hook here does) sidesteps it. Follow this shape for
// every hook added later; client.ts itself needs no changes.

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/auth/me')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const client = getApiClient()
      const result = await client.POST('/auth/login', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    // Body shape matches RegisterInput in openapi.yaml — businessName, not username/displayName,
    // since LOOPIE has one Business per account rather than a public username/profile.
    mutationFn: async (body: { email: string; password: string; businessName: string }) => {
      const client = getApiClient()
      const result = await client.POST('/auth/register', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const client = getApiClient()
      const result = await client.POST('/auth/logout')
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
