import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, getApiClient } from '../client'
import { useCurrentUser } from './useAuth'

function unwrap<T>(result: { data?: T; error?: unknown; response: { status: number } }) {
  if (result.error) throw new ApiError(result.response.status, 'Could not load assignments')
  return result.data!
}

export function useAssignmentNotifications() {
  const me = useCurrentUser()
  return useQuery({
    queryKey: ['assignment-notifications', me.data?.data.id, me.data?.data.businessId],
    enabled: !!me.data?.data.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const result = await getApiClient().GET('/inbox/assignments')
      return unwrap(result)
    },
  })
}

export function useReadAssignmentNotification() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await getApiClient().POST('/inbox/assignments/{notificationId}/read', {
        params: { path: { notificationId } },
      })
      if (!result.response.ok)
        throw new ApiError(result.response.status, 'Could not mark assignment read')
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['assignment-notifications'] }),
  })
}
