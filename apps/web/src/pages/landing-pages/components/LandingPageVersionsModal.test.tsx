import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingPageVersionsModal } from './LandingPageVersionsModal'

const mocks = vi.hoisted(() => ({
  versions: [] as unknown[],
  isLoading: false,
}))

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useLandingPageVersions: () => ({
    isLoading: mocks.isLoading,
    data: { data: mocks.versions, meta: { hasMore: false, nextCursor: null } },
  }),
}))

describe('LandingPageVersionsModal', () => {
  it('lists real published versions with a Live badge on the currently published one, and never implies restore is possible', () => {
    mocks.versions = [
      { id: 'v-2', version: 2, publishedAt: '2026-09-14T00:00:00.000Z', content: { hero: {} } },
      {
        id: 'v-1',
        version: 1,
        publishedAt: '2026-09-01T00:00:00.000Z',
        content: { hero: {}, faq: {} },
      },
    ]
    render(
      <LandingPageVersionsModal
        landingPageId="lp-1"
        currentPublishedVersionId="v-2"
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Version 2')).toBeInTheDocument()
    expect(screen.getByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText('Live now')).toBeInTheDocument()
    expect(
      screen.getByText(/restoring an earlier version isn't supported yet/i),
    ).toBeInTheDocument()
  })

  it('expands a row to show which sections that version actually had', () => {
    mocks.versions = [
      {
        id: 'v-1',
        version: 1,
        publishedAt: '2026-09-01T00:00:00.000Z',
        content: { hero: {}, faq: {} },
      },
    ]
    render(
      <LandingPageVersionsModal
        landingPageId="lp-1"
        currentPublishedVersionId={null}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Version 1/ }))
    expect(screen.getByText(/Sections in this version: hero, faq/)).toBeInTheDocument()
  })

  it('shows an honest empty state for a page that has never been published', () => {
    mocks.versions = []
    render(
      <LandingPageVersionsModal
        landingPageId="lp-1"
        currentPublishedVersionId={null}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/never been published/)).toBeInTheDocument()
  })
})
