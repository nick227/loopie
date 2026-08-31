import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CanvasAdBand } from './CanvasAdBand'
import { useAdCatalog } from './useAdCatalog'

vi.mock('./useAdCatalog', () => ({ useAdCatalog: vi.fn() }))

describe('CanvasAdBand', () => {
  it('assigns a real Page run from the Ad catalog', () => {
    const onChange = vi.fn()
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
          slots={[{ placement: 'AFTER_HERO', adUnitId: null }]}
          onChange={onChange}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('option', { name: 'Summer offer · Local launch · ACTIVE' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'unit-2' } })
    expect(onChange).toHaveBeenCalledWith([{ placement: 'AFTER_HERO', adUnitId: 'unit-2' }])
  })

  it('does not enable an empty placement when no Page-ready Ads exist', () => {
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
