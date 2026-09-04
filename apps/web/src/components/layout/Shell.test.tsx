import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reactQuery from '@tanstack/react-query'
import {
  useAdvertisements,
  useAssets,
  useBusiness,
  useCreateAsset,
  useCreateLandingPage,
  useCreateRiverPost,
  useCurrentUser,
  useLandingPageTemplates,
  useLandingPages,
  useLogout,
  useInboxThreads,
  useNextAction,
} from '@project/sdk'
import { Shell } from './Shell'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useCurrentUser: vi.fn(),
  useLogout: vi.fn(),
  // Shell's header renders CreateMenu unconditionally, which calls useQuickCreatePage AND (since
  // the River-composer-v2 slice wired RiverComposerModal in as a "River post" entry) a handful of
  // real react-query hooks RiverComposerModal itself calls unconditionally on mount — all need
  // mocking here the same way every other page test mocks the SDK hooks its rendered tree
  // touches (there's no global QueryClientProvider test wrapper).
  useLandingPageTemplates: vi.fn(),
  useCreateLandingPage: vi.fn(),
  useCreateRiverPost: vi.fn(),
  useLandingPages: vi.fn(),
  useAdvertisements: vi.fn(),
  useAssets: vi.fn(),
  useCreateAsset: vi.fn(),
  useBusiness: vi.fn(),
  useInboxThreads: vi.fn(),
  useNextAction: vi.fn(),
}))

// AssistantPanel (always mounted alongside AssistantLauncher — see its own comment) calls
// useQueryClient directly rather than through an SDK hook, so it needs its own mock the same way.
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: vi.fn(),
}))

describe('Shell profile navigation', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { data: { email: 'owner@example.com', role: 'ADMIN' } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useLogout).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useLogout>)
    vi.mocked(useLandingPageTemplates).mockReturnValue({
      isLoading: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useLandingPageTemplates>)
    vi.mocked(useCreateLandingPage).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useCreateLandingPage>)
    vi.mocked(useCreateRiverPost).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useCreateRiverPost>)
    vi.mocked(useLandingPages).mockReturnValue({
      isLoading: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useLandingPages>)
    vi.mocked(useAdvertisements).mockReturnValue({
      isLoading: false,
      data: { data: [] },
    } as unknown as ReturnType<typeof useAdvertisements>)
    vi.mocked(useAssets).mockReturnValue({
      isLoading: false,
      data: { pages: [{ data: [] }] },
    } as unknown as ReturnType<typeof useAssets>)
    vi.mocked(useCreateAsset).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useCreateAsset>)
    vi.mocked(useBusiness).mockReturnValue({
      data: { data: { name: 'Owner Business', logoUrl: null } },
    } as unknown as ReturnType<typeof useBusiness>)
    vi.mocked(useInboxThreads).mockReturnValue({
      data: { data: [] },
    } as unknown as ReturnType<typeof useInboxThreads>)
    vi.mocked(useNextAction).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useNextAction>)
    vi.mocked(reactQuery.useQueryClient).mockReturnValue({
      invalidateQueries: vi.fn(),
    } as unknown as ReturnType<typeof reactQuery.useQueryClient>)
  })

  it('links the header avatar to the private profile', async () => {
    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/inbox" element={<p>Inbox</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    // The header avatar (aria-label "Profile") is a direct link to the private profile — the
    // persistent-top-nav redesign (CLAUDE.md's 2026-08-30 nav revision) dropped the old MoreMenu
    // account dropdown that used to sit in front of it.
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
  })

  it('shows the unread inbox count on the messages icon', async () => {
    vi.mocked(useInboxThreads).mockReturnValue({
      data: { data: [{ id: 'thread-1' }, { id: 'thread-2' }] },
    } as unknown as ReturnType<typeof useInboxThreads>)

    render(
      <MemoryRouter initialEntries={['/inbox']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/inbox" element={<p>Inbox</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    // The badge is a subtle dot indicator, not a numeric count — the accessible name carries the
    // actual count for assistive tech.
    const messagesButton = screen.getByRole('button', { name: 'Messages, 2 unread' })
    expect(messagesButton.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('renders a business profile (/b/:slug) inside the persistent Shell nav, not standalone chrome', async () => {
    // Regression guard: /b/:slug used to be a top-level route outside <Shell/> entirely, giving
    // it its own bespoke header instead of the app's Calendar/Pages/Advertising/CRM nav. See the
    // "Business profiles: redesign + fold into the app shell" plan doc — Business Profile is the
    // business's identity *inside* Loopie, not a separate published website product.
    render(
      <MemoryRouter initialEntries={['/b/northline-studio']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/b/:slug" element={<p>Business profile content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pages' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Advertising' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CRM' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'River' })).toBeInTheDocument()
  })

  it('opens a mobile nav drawer with Messages and River', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/calendar" element={<p>Calendar</p>} />
            <Route path="/messages" element={<p>Messages</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument()
    // Drawer + desktop icon both render River; at least one must be present.
    expect(screen.getAllByRole('link', { name: 'River' }).length).toBeGreaterThan(0)
  })
})
