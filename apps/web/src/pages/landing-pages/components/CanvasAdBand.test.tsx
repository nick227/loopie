import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CanvasAdBand } from './CanvasAdBand'
import { useAdCatalog } from './useAdCatalog'
import { useAdvertisements } from '@project/sdk'

vi.mock('./useAdCatalog', () => ({ useAdCatalog: vi.fn() }))
vi.mock('@project/sdk', () => ({ useAdvertisements: vi.fn() }))

function mockNoAdvertisements() {
  vi.mocked(useAdvertisements).mockReturnValue({
    data: { data: [] },
  } as unknown as ReturnType<typeof useAdvertisements>)
}

describe('CanvasAdBand', () => {
  it('assigns a real Ad run from the Ad catalog', () => {
    const onChange = vi.fn()
    mockNoAdvertisements()
    vi.mocked(useAdCatalog).mockReturnValue({
      units: [
        {
          id: 'unit-2',
          creativeId: 'ad-2',
          campaignId: 'campaign-1',
          status: 'ACTIVE',
        },
      ],
      loading: false,
      failed: false,
      labelFor: () => 'Summer offer · Local launch · ACTIVE',
    } as unknown as ReturnType<typeof useAdCatalog>)

    render(
      <MemoryRouter>
        <CanvasAdBand
          placement="AFTER_HERO"
          slots={[{ placement: 'AFTER_HERO', adRunId: null, advertisementId: null }]}
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('option', { name: 'Summer offer · Local launch · ACTIVE' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'run:unit-2' } })
    expect(onChange).toHaveBeenCalledWith([
      { placement: 'AFTER_HERO', adRunId: 'unit-2', advertisementId: null },
    ])
  })

  it('assigns a saved Ad Designer creative', () => {
    const onChange = vi.fn()
    vi.mocked(useAdvertisements).mockReturnValue({
      data: {
        data: [
          {
            id: 'ad-1',
            name: 'Fall Sale',
            format: 'POSTER',
            lastPublishedAt: '2026-09-01T00:00:00Z',
          },
          // Not offered — never published.
          { id: 'ad-2', name: 'Draft Poster', format: 'POSTER', lastPublishedAt: null },
        ],
      },
    } as unknown as ReturnType<typeof useAdvertisements>)
    vi.mocked(useAdCatalog).mockReturnValue({
      units: [],
      loading: false,
      failed: false,
      labelFor: vi.fn(),
    } as unknown as ReturnType<typeof useAdCatalog>)

    render(
      <MemoryRouter>
        <CanvasAdBand
          placement="AFTER_HERO"
          slots={[{ placement: 'AFTER_HERO', adRunId: null, advertisementId: null }]}
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('option', { name: 'Fall Sale · POSTER' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Draft Poster/ })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'ad:ad-1' } })
    expect(onChange).toHaveBeenCalledWith([
      { placement: 'AFTER_HERO', adRunId: null, advertisementId: 'ad-1' },
    ])
  })

  it('does not enable an empty placement when no Page-ready Ads exist', () => {
    mockNoAdvertisements()
    vi.mocked(useAdCatalog).mockReturnValue({
      units: [],
      loading: false,
      failed: false,
      labelFor: vi.fn(),
    } as unknown as ReturnType<typeof useAdCatalog>)

    render(
      <MemoryRouter>
        <CanvasAdBand placement="BOTTOM" slots={[]} onChange={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/No Page-ready Ads/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add ad space' })).toBeDisabled()
  })
})
