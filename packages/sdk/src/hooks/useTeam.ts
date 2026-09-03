import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

export type MyBusiness = components['schemas']['MyBusiness']
export type TeamMember = components['schemas']['TeamMember']
export type TeamInvitation = components['schemas']['TeamInvitation']
export type InviteTeamMemberInput = components['schemas']['InviteTeamMemberInput']
export type UpdateTeamMemberInput = components['schemas']['UpdateTeamMemberInput']
export type TeamMemberMetrics = components['schemas']['TeamMemberMetrics']

export function useMyBusinesses() {
  return useQuery({
    queryKey: ['me', 'businesses'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/me/businesses')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
  })
}

export function useSetActiveBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (businessId: string) => {
      const client = getApiClient()
      const result = await client.POST('/me/active-business', { body: { businessId } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: async () => {
      // Switching companies must drop every business-scoped cache, not just ['me'].
      await queryClient.cancelQueries()
      queryClient.clear()
    },
  })
}

export function useBusinessTeam() {
  return useQuery({
    queryKey: ['business', 'team'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/business/team')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
  })
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: InviteTeamMemberInput) => {
      const client = getApiClient()
      const result = await client.POST('/business/team/invitations', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'team'] })
    },
  })
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, body }: { userId: string; body: UpdateTeamMemberInput }) => {
      const client = getApiClient()
      const result = await client.PATCH('/business/team/members/{userId}', {
        params: { path: { userId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['business', 'team'] })
      queryClient.invalidateQueries({ queryKey: ['business', 'team', 'member', vars.userId] })
    },
  })
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/business/team/members/{userId}', {
        params: { path: { userId } },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as { error: string }).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'team'] })
    },
  })
}

export function useTeamMemberMetrics(userId: string) {
  return useQuery({
    queryKey: ['business', 'team', 'member', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/business/team/members/{userId}/metrics', {
        params: { path: { userId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
  })
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    enabled: Boolean(token),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/invitations/{token}', {
        params: { path: { token } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      const client = getApiClient()
      const result = await client.POST('/invitations/{token}/accept', {
        params: { path: { token } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
    },
  })
}
