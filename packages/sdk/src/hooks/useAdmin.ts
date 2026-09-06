import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { paths, operations } from '../generated/types'

type AdminListBusinessesQuery = operations['adminListBusinesses']['parameters']['query']

export function useAdminListBusinesses(query: AdminListBusinessesQuery = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: ['admin', 'businesses', query],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/admin/businesses', {
        params: {
          query: {
            ...query,
            cursor: pageParam,
          } as any,
        },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}

type AdminListUsersQuery = operations['adminListUsers']['parameters']['query']

export function useAdminListUsers(query: AdminListUsersQuery = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: ['admin', 'users', query],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/admin/users', {
        params: {
          query: {
            ...query,
            cursor: pageParam,
          } as any,
        },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}

type AdminGetBusinessPath = operations['adminGetBusiness']['parameters']['path']
type AdminGetBusinessResponse =
  paths['/admin/businesses/{businessId}']['get']['responses']['200']['content']['application/json']

export function useAdminGetBusiness(
  params: { path: AdminGetBusinessPath },
  options?: Omit<
    UseQueryOptions<AdminGetBusinessResponse, Error, AdminGetBusinessResponse, any>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: ['admin', 'business', params.path.businessId],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/admin/businesses/{businessId}', {
        params,
      })
      if (error) throw error
      return data
    },
    ...options,
  })
}

type AdminUpdateBusinessLicensePath = operations['adminUpdateBusinessLicense']['parameters']['path']
type AdminUpdateBusinessLicenseBody =
  operations['adminUpdateBusinessLicense']['requestBody']['content']['application/json']
type AdminUpdateBusinessLicenseResponse =
  paths['/admin/businesses/{businessId}/license']['put']['responses']['200']['content']['application/json']

export function useAdminUpdateBusinessLicense(
  options?: UseMutationOptions<
    AdminUpdateBusinessLicenseResponse,
    Error,
    { path: AdminUpdateBusinessLicensePath; body: AdminUpdateBusinessLicenseBody }
  >,
) {
  return useMutation({
    mutationFn: async ({ path, body }) => {
      const { data, error } = await getApiClient().PUT('/admin/businesses/{businessId}/license', {
        params: { path },
        body,
      })
      if (error) throw error
      return data
    },
    ...options,
  })
}

type AdminListAuditEventsQuery = operations['adminListAuditEvents']['parameters']['query']

export function useAdminListAuditEvents(query: AdminListAuditEventsQuery = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audit', query],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/admin/audit', {
        params: {
          query: {
            ...query,
            cursor: pageParam,
          } as any,
        },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}

type AdminStartSupportSessionBody =
  operations['adminStartSupportSession']['requestBody']['content']['application/json']
type AdminStartSupportSessionResponse =
  paths['/admin/support-session']['post']['responses']['200']['content']['application/json']

export function useAdminStartSupportSession(
  options?: UseMutationOptions<
    AdminStartSupportSessionResponse,
    Error,
    AdminStartSupportSessionBody
  >,
) {
  return useMutation({
    mutationFn: async (body) => {
      const { data, error } = await getApiClient().POST('/admin/support-session', { body })
      if (error) throw error
      return data
    },
    ...options,
  })
}

type AdminEndSupportSessionResponse =
  paths['/admin/support-session']['delete']['responses']['200']['content']['application/json']

export function useAdminEndSupportSession(
  options?: UseMutationOptions<AdminEndSupportSessionResponse, Error, void>,
) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await getApiClient().DELETE('/admin/support-session')
      if (error) throw error
      return data
    },
    ...options,
  })
}
