import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RiverComposerModal } from './RiverComposerModal'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useAdvertisements: vi.fn(() => ({ data: { data: [] } })),
  useAssets: vi.fn(() => ({ data: { pages: [] } })),
  useBusiness: vi.fn(() => ({
    data: {
      data: {
        name: 'Midnight Creative',
        logoUrl: '/uploads/f879b1e0-0d27-42fa-9522-aec25c9b4b4e.jpg',
      },
    },
  })),
  useCreateAsset: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useCreateRiverPost: vi.fn(() => ({
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  })),
  useLandingPages: vi.fn(() => ({ data: { pages: [] } })),
}))

describe('RiverComposerModal', () => {
  it('resolves a relative business logo URL against the API origin', () => {
    render(<RiverComposerModal isOpen onClose={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'Midnight Creative' })).toHaveAttribute(
      'src',
      'http://localhost:3001/uploads/f879b1e0-0d27-42fa-9522-aec25c9b4b4e.jpg',
    )
  })
})
