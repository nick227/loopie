import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePlatformConnection, useStartPlatformOAuth } from '@project/sdk'
import { PlatformsPage } from './PlatformsPage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  usePlatformConnection: vi.fn(),
  useStartPlatformOAuth: vi.fn(),
}))

describe('PlatformsPage', () => {
  it('renders only connection state returned by the API', () => {
    vi.mocked(usePlatformConnection).mockImplementation(
      (platform) =>
        ({
          isLoading: false,
          isError: false,
          data: {
            data: {
              platform,
              status: platform === 'META' ? 'CONNECTED' : 'DISCONNECTED',
              configured: platform === 'META',
              adAccountId: platform === 'META' ? 'account-7' : null,
              pageId: null,
              defaultCountry: 'US',
              capabilities: {
                oauth: true,
                mappingFields: [],
                pushDraft: false,
                pullSpend: false,
                activate: false,
              },
            },
          },
        }) as unknown as ReturnType<typeof usePlatformConnection>,
    )
    vi.mocked(useStartPlatformOAuth).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useStartPlatformOAuth>)

    render(<PlatformsPage />)
    expect(screen.getByText('Ad account account-7')).toBeInTheDocument()
    expect(screen.queryByText(/followers/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Unavailable' })).toHaveLength(2)
  })
})
