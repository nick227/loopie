import { useMemo } from 'react'

export function useFlatPages<T>(
  query: { data?: { pages: { data: T[] }[] } } | null | undefined,
): T[] {
  return useMemo(() => query?.data?.pages.flatMap((p) => p.data) ?? [], [query?.data])
}
