import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createApiClient } from '@project/sdk'
import { HomePage } from './HomePage'

function mount(role?: string) {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    role
      ? new Response(
          JSON.stringify({
            data: {
              id: 'user-1',
              platformRole: role,
              businessName: 'Example',
              email: 'test@example.com',
            },
          }),
          { status: 200 },
        )
      : new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  )
  createApiClient({ baseUrl: 'http://localhost:3001' })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return fetcher
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('HomePage', () => {
  it('explains the product in a table without fetching a public feed', async () => {
    const fetcher = mount()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Plan your business, launch pages and ads, and handle messaging on one platform.',
    )
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('rowheader')).toHaveLength(10)
    expect(screen.getByRole('link', { name: /Browse River/ })).toHaveAttribute('href', '/river')
    const links = await screen.findAllByRole('link', { name: /Create an account/ })
    for (const link of links) expect(link).toHaveAttribute('href', '/register')
    expect(screen.getAllByRole('button', { name: 'Talk to us' })).toHaveLength(2)
    expect(fetcher.mock.calls.every(([input]) => (input as Request).url.includes('/auth/me'))).toBe(
      true,
    )
  })

  it.each([
    ['BUSINESS_USER', '/app'],
    ['AFFILIATE', '/portal'],
  ])('opens the correct app destination for %s', async (role, destination) => {
    mount(role)
    for (const link of await screen.findAllByRole('link', { name: /Open LOOPIE/ })) {
      expect(link).toHaveAttribute('href', destination)
    }
    expect(screen.queryByRole('link', { name: /Create an account/ })).not.toBeInTheDocument()
  })

  it('does not offer registration while the session is still loading', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    createApiClient({ baseUrl: 'http://localhost:3001' })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(
      screen.queryByRole('link', { name: /Create an account|Open LOOPIE/ }),
    ).not.toBeInTheDocument()
  })
})
