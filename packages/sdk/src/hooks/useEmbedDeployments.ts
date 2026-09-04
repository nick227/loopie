import { useMutation } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function unwrap<T>(result: { data?: T; error?: unknown; response: { status: number } }) {
  const err = result.error
  const data = result.data
  if (err) throw new ApiError(result.response.status, (err as { error: string }).error)
  return data!
}

// One deployment per (objectType, objectId) — get-or-create, so calling this repeatedly for the
// same Advertisement/LandingPage is always safe and always returns the same publicId. Used by the
// Ad Designer's "copy embed code" panel and the Landing Page equivalent.
export function useGetOrCreateEmbedDeployment() {
  return useMutation({
    mutationFn: async (input: { objectType: 'PAGE' | 'ADVERTISEMENT'; objectId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/embed-deployments/get-or-create', {
          body: input,
        }),
      )
    },
  })
}
