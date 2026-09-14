import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { LandingPageMoreMenu } from './LandingPageMoreMenu'

// Regression coverage for the 2026-09-14 fix: Export and Version history are real, backend-
// complete V1 capabilities (GET .../export, GET .../versions) that had generated pages but were
// never linked into the editor anywhere — this is that missing entry point.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  getApiClient: () => ({ GET: mocks.get }),
}))

function show(onVersions = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <LandingPageMoreMenu landingPageId="lp-1" onVersions={onVersions} />
    </QueryClientProvider>,
  )
  return { onVersions }
}

describe('LandingPageMoreMenu', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mocks.get.mockReset()
  })

  it('exports a real HTML download built from the actual export response, not a fake success', async () => {
    mocks.get.mockResolvedValue({
      data: { data: { filename: 'my-page.html', html: '<html>real content</html>' } },
      error: undefined,
    })
    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    show()
    fireEvent.click(screen.getByRole('button', { name: 'More page actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export HTML' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Page exported'))
    expect(mocks.get).toHaveBeenCalledWith('/landing-pages/{landingPageId}/export', {
      params: { path: { landingPageId: 'lp-1' } },
    })
    expect(createObjectURL).toHaveBeenCalled()
    const [blobArg] = createObjectURL.mock.calls[0]!
    expect(blobArg.type).toBe('text/html')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  it('surfaces a real export failure instead of a silent no-op', async () => {
    mocks.get.mockResolvedValue({ data: undefined, error: { error: 'Page not found' } })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'More page actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export HTML' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Page not found'))
  })

  it('opens version history via the onVersions callback', () => {
    const { onVersions } = show()
    fireEvent.click(screen.getByRole('button', { name: 'More page actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Version history' }))
    expect(onVersions).toHaveBeenCalledOnce()
  })
})
