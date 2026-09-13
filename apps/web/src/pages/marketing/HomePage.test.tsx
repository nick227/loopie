import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createApiClient } from '@project/sdk'
import { HomePage } from './HomePage'

// HomePage renders inside the app's normal Shell (see App.tsx) — no header/footer of its own.
// Shell's own auth-aware header behavior is already covered by Shell.test.tsx; these tests cover
// only HomePage's own content.
function mount() {
  createApiClient({ baseUrl: 'http://localhost:3001' })
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockRiverFeedFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input as Request
    if (request.url.includes('/river/feed'))
      return new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 })
    // Hero's and CtaBand's SiteInquiryButton each call useCurrentUser() to prefill the inquiry
    // form — irrelevant to what these tests assert, but must resolve for the page to render.
    if (request.url.includes('/auth/me')) return new Response('{}', { status: 401 })
    throw new Error(`Unexpected fetch in test: ${request.url}`)
  })
}

describe('HomePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the hero, pillar index, River section, and CTA without throwing', async () => {
    const fetcher = mockRiverFeedFetch()
    mount()

    expect(
      screen.getByText('Run the work that brings in customers and turns them into sales.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Get started' }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: 'Talk to us' }).length).toBe(2)
    expect(screen.getByText('What LOOPIE does')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Run customer acquisition, follow-up, sales, operations, and partner growth from one place.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Ready to put it all in one place?')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Real posts from LOOPIE businesses will appear here as they’re published.',
      ),
    ).toBeInTheDocument()
    fetcher.mockRestore()
  })

  it('renders every pillar across the four groups, with no per-group visual', async () => {
    const fetcher = mockRiverFeedFetch()
    mount()
    await screen.findByText('What LOOPIE does')

    const pillarSection = document.getElementById('pillars')
    if (!pillarSection) throw new Error('pillar index section not found')

    for (const group of [
      'Bring in customers',
      'Manage leads and sales',
      'Plan, track, and operate',
      'Grow through partners and reach',
    ]) {
      expect(within(pillarSection).getByRole('heading', { name: group })).toBeInTheDocument()
    }
    for (const pillar of [
      'Advertising',
      'Landing Pages',
      'Forms',
      'Messages & Automation',
      'Contacts & Audiences',
      'Leads & Sales Pipeline',
      'Calendar',
      'Teams',
      'CRM Integrations',
      'Money & Ledger',
      'Affiliate Partners',
      'River',
    ]) {
      expect(within(pillarSection).getByText(pillar)).toBeInTheDocument()
    }
    // First-Party Ad Serving isn't a separate pillar — Advertising's own one-sentence copy
    // folds it in as a clause ("serve ads with full attribution") instead of a second sentence.
    expect(
      within(pillarSection).getByText(
        'Create campaigns, publish creative, and serve ads with full attribution.',
      ),
    ).toBeInTheDocument()
    expect(within(pillarSection).queryByText('First-Party Ad Serving')).not.toBeInTheDocument()
    // Purely typographic now — no visual/screenshot elements in this section.
    expect(within(pillarSection).queryAllByRole('img').length).toBe(0)
    fetcher.mockRestore()
  })
})
