import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as sdk from '@project/sdk'
import { AdPage } from './AdPage'

vi.mock('@project/sdk', async () => {
  const actual = await vi.importActual('@project/sdk')
  return {
    ...(actual as object),
    useAdvertisement: vi.fn(),
    useAdRuns: vi.fn(),
    useAsset: vi.fn(() => ({ data: undefined })),
    useLandingPages: vi.fn(() => ({ data: { pages: [] } })),
    useCreateAsset: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useUpdateAdvertisement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useCreateAdRun: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    usePauseAdRun: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useResumeAdRun: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  }
})

function stub<T>(value: object): T {
  return value as T
}

describe('AdPage', () => {
  it('renders a loading skeleton initially', () => {
    vi.mocked(sdk.useAdvertisement).mockReturnValue(
      stub<ReturnType<typeof sdk.useAdvertisement>>({ isLoading: true, data: undefined }),
    )
    vi.mocked(sdk.useAdRuns).mockReturnValue(
      stub<ReturnType<typeof sdk.useAdRuns>>({ data: undefined }),
    )

    const { container } = render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(container.querySelector('.animate-pulse')).toBeTruthy()
    expect(screen.queryByText('Platform Runs')).toBeNull()
  })

  it('renders the ad editor with destinations and start/pause', () => {
    vi.mocked(sdk.useAdvertisement).mockReturnValue(
      stub<ReturnType<typeof sdk.useAdvertisement>>({
        isLoading: false,
        data: { data: { id: 'ad_123', name: 'Test Ad Name', assetIds: ['asset_1'] } },
      }),
    )
    vi.mocked(sdk.useAdRuns).mockReturnValue(
      stub<ReturnType<typeof sdk.useAdRuns>>({
        data: {
          data: [
            {
              id: 'run_1',
              platform: 'META',
              placement: 'FEED',
              status: 'ACTIVE',
              budget: 10,
              spend: 5,
              impressions: 100,
              clicks: 10,
              conversions: 1,
            },
          ],
        },
      }),
    )
    vi.mocked(sdk.useAsset).mockReturnValue(
      stub<ReturnType<typeof sdk.useAsset>>({
        data: {
          data: {
            id: 'asset_1',
            type: 'IMAGE',
            name: 'Hero',
            url: '/uploads/hero.png',
            placements: [],
          },
        },
      }),
    )
    vi.mocked(sdk.useLandingPages).mockReturnValue(
      stub<ReturnType<typeof sdk.useLandingPages>>({
        data: {
          pages: [{ data: [{ id: 'lp1', name: 'Book a Detail', status: 'PUBLISHED' }] }],
        },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Test Ad Name' })).toBeTruthy()
    expect(screen.getByText('Meta Feed')).toBeTruthy()
    expect(screen.getByText('Book a Detail')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desktop' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mobile' })).toBeTruthy()
    expect(screen.queryByText('Active globally')).toBeNull()
    expect(screen.queryByText('Platform Runs')).toBeNull()
    expect(screen.queryByText('Paused globally')).toBeNull()
    expect(screen.queryByText('Provision Run')).toBeNull()
  })
})
