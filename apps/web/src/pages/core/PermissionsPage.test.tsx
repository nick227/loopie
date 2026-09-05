import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useDisconnectIntegration,
  useDisconnectPlatformConnection,
  useIntegrations,
  usePlatformConnection,
} from '@project/sdk'
import { PermissionsPage } from './PermissionsPage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useDisconnectIntegration: vi.fn(),
  useDisconnectPlatformConnection: vi.fn(),
  useIntegrations: vi.fn(),
  usePlatformConnection: vi.fn(),
}))

describe('PermissionsPage', () => {
  it('shows active permissions and removes access after confirmation', async () => {
    const disconnect = vi.fn().mockResolvedValue({})
    vi.mocked(useIntegrations).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pages: [{ data: [], meta: { hasMore: false, nextCursor: null } }] },
    } as unknown as ReturnType<typeof useIntegrations>)
    vi.mocked(usePlatformConnection).mockImplementation(
      (platform) =>
        ({
          isLoading: false,
          isError: false,
          data: {
            data: {
              platform,
              status: platform === 'META' ? 'CONNECTED' : 'DISCONNECTED',
              adAccountId: platform === 'META' ? 'act-42' : null,
              pageId: null,
              defaultCountry: 'US',
              configured: true,
              capabilities: {
                oauth: true,
                mappingFields: [],
                pushDraft: true,
                pullSpend: true,
                activate: true,
              },
            },
          },
        }) as unknown as ReturnType<typeof usePlatformConnection>,
    )
    vi.mocked(useDisconnectPlatformConnection).mockReturnValue({
      isPending: false,
      mutateAsync: disconnect,
    } as unknown as ReturnType<typeof useDisconnectPlatformConnection>)
    vi.mocked(useDisconnectIntegration).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useDisconnectIntegration>)

    render(
      <MemoryRouter>
        <PermissionsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Permissions' })).toBeInTheDocument()
    expect(screen.getByText('Ad account act-42')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Remove access' }))
    await user.click(screen.getAllByRole('button', { name: 'Remove access' }).at(-1)!)
    expect(disconnect).toHaveBeenCalledWith('META')
  })
})
