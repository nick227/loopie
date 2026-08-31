import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFlatPages } from './useFlatPages'

describe('useFlatPages', () => {
  it('flattens react query infinite pages into a single array', () => {
    const mockQueryData = {
      data: {
        pages: [{ data: [1, 2] }, { data: [3, 4] }, { data: [5] }],
      },
    }

    const { result } = renderHook(() => useFlatPages<number>(mockQueryData))

    expect(result.current).toEqual([1, 2, 3, 4, 5])
  })

  it('returns empty array when query data is undefined', () => {
    const { result } = renderHook(() => useFlatPages(undefined))
    expect(result.current).toEqual([])
  })

  it('returns empty array when pages is empty', () => {
    const mockQueryData = {
      data: {
        pages: [],
      },
    }
    const { result } = renderHook(() => useFlatPages<never>(mockQueryData))
    expect(result.current).toEqual([])
  })
})
