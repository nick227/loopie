import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VirtualInfiniteList } from './VirtualInfiniteList'

// Mock useWindowVirtualizer from react-virtual to avoid real DOM measuring issues in JSDOM
vi.mock('@tanstack/react-virtual', () => {
  return {
    useWindowVirtualizer: vi.fn(() => ({
      getVirtualItems: () => [
        { index: 0, start: 0, size: 50, key: '0' },
        { index: 1, start: 50, size: 50, key: '1' },
      ],
      getTotalSize: () => 100,
      measureElement: vi.fn(),
    })),
  }
})

describe('VirtualInfiniteList', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ]
  const mockFetchNextPage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders standard items correctly', () => {
    render(
      <VirtualInfiniteList
        items={mockItems}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={mockFetchNextPage}
        renderItem={(item) => <div data-testid="item">{item.name}</div>}
      />,
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('renders a loading row when fetching next page', async () => {
    // Override the mock temporarily to simulate a 3rd "loading" row
    const reactVirtual = await import('@tanstack/react-virtual')
    vi.mocked(reactVirtual).useWindowVirtualizer.mockReturnValueOnce({
      getVirtualItems: () => [
        { index: 0, start: 0, size: 50, key: '0' },
        { index: 1, start: 50, size: 50, key: '1' },
        { index: 2, start: 100, size: 50, key: '2' }, // Loader row
      ],
      getTotalSize: () => 150,
      measureElement: vi.fn(),
    } as unknown as ReturnType<typeof reactVirtual.useWindowVirtualizer>)

    render(
      <VirtualInfiniteList
        items={mockItems}
        hasNextPage={true}
        isFetchingNextPage={true}
        fetchNextPage={mockFetchNextPage}
        renderItem={(item) => <div>{item.name}</div>}
      />,
    )

    expect(screen.getByText('Loading more...')).toBeInTheDocument()
  })
})
