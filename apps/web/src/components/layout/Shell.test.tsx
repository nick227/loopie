import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('renders a business profile (/b/:slug) inside the persistent Shell nav, not standalone chrome', async () => {
    // Regression guard: /b/:slug used to be a top-level route outside <Shell/> entirely, giving
    // it its own bespoke header instead of the app's Home/Pages/Advertising/CRM nav. See the
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

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pages' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Advertising' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CRM' })).toBeInTheDocument()
    // Not a tab root, so it gets the back-subheader — ENTITY_ROUTES falls back to River.
    expect(screen.getByRole('button', { name: /river/i })).toBeInTheDocument()
  })
})
