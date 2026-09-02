import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as sdk from '@project/sdk'
import { InboxThreadPage } from './InboxThreadPage'

vi.mock('@project/sdk', async () => {
  const actual = await vi.importActual('@project/sdk')
  return {
    ...(actual as object),
    useInboxThread: vi.fn(),
    useMarkInboxThreadRead: vi.fn(),
    useReplyToInboxThread: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
  }
})

function stub<T>(value: object): T {
  return value as T
}

function renderThread() {
  return render(
    <MemoryRouter initialEntries={['/inbox/thread_1']}>
      <Routes>
        <Route path="/inbox/:threadId" element={<InboxThreadPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InboxThreadPage', () => {
  it('renders messages chronologically with kind/direction and marks an unread thread read', async () => {
    vi.mocked(sdk.useInboxThread).mockReturnValue(
      stub<ReturnType<typeof sdk.useInboxThread>>({
        isLoading: false,
        data: {
          data: {
            thread: {
              id: 'thread_1',
              type: 'CONTACT',
              subject: 'Sarah Chen',
              contactId: 'contact_1',
              advertisementId: null,
              platform: null,
              previewKind: 'SMS',
              previewBody: 'Yes, Thursday works for me.',
              unread: true,
              lastMessageAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            messages: [
              {
                id: 'm1',
                kind: 'SMS',
                direction: 'OUTBOUND',
                subject: null,
                body: 'Are you still good for Thursday?',
                createdAt: '2026-08-01T00:00:00.000Z',
              },
            ],
          },
        },
      }),
    )
    const mutate = vi.fn()
    vi.mocked(sdk.useMarkInboxThreadRead).mockReturnValue(
      stub<ReturnType<typeof sdk.useMarkInboxThreadRead>>({ mutate, isPending: false }),
    )

    renderThread()

    expect(screen.getByText('Sarah Chen')).toBeTruthy()
    expect(screen.getByText('Are you still good for Thursday?')).toBeTruthy()
    expect(screen.getByText(/Text · Sent/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open contact' })).toBeTruthy()
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('thread_1'))
  })

  it('does not call mark-read for an already-read thread', () => {
    vi.mocked(sdk.useInboxThread).mockReturnValue(
      stub<ReturnType<typeof sdk.useInboxThread>>({
        isLoading: false,
        data: {
          data: {
            thread: {
              id: 'thread_2',
              type: 'ADVERTISEMENT',
              subject: 'META · Summer Roofing Lead Ad',
              contactId: null,
              advertisementId: 'ad_1',
              platform: 'META',
              previewKind: 'SYSTEM',
              previewBody: null,
              unread: false,
              lastMessageAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            messages: [
              {
                id: 'm2',
                kind: 'SYSTEM',
                direction: 'INTERNAL',
                subject: 'Meta rejected this ad',
                body: 'Missing disclaimer. Review the issue and fix it.',
                createdAt: '2026-08-01T00:00:00.000Z',
              },
            ],
          },
        },
      }),
    )
    const mutate = vi.fn()
    vi.mocked(sdk.useMarkInboxThreadRead).mockReturnValue(
      stub<ReturnType<typeof sdk.useMarkInboxThreadRead>>({ mutate, isPending: false }),
    )

    renderThread()

    expect(screen.getByText('Meta rejected this ad')).toBeTruthy()
    expect(screen.getByText('Missing disclaimer. Review the issue and fix it.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open advertisement' })).toBeTruthy()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('deep-links a PAGE thread to its landing page and an INTEGRATION thread to Platforms', () => {
    vi.mocked(sdk.useInboxThread).mockReturnValue(
      stub<ReturnType<typeof sdk.useInboxThread>>({
        isLoading: false,
        data: {
          data: {
            thread: {
              id: 'thread_3',
              type: 'PAGE',
              subject: 'Kitchen Remodel',
              contactId: null,
              advertisementId: null,
              platform: null,
              landingPageId: 'page_1',
              integrationPlatform: null,
              previewKind: 'SYSTEM',
              previewBody: null,
              unread: false,
              lastMessageAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            messages: [
              {
                id: 'm3',
                kind: 'SYSTEM',
                direction: 'INTERNAL',
                subject: 'New submission',
                body: 'New submission from Marcus Hill.',
                createdAt: '2026-08-01T00:00:00.000Z',
              },
            ],
          },
        },
      }),
    )
    vi.mocked(sdk.useMarkInboxThreadRead).mockReturnValue(
      stub<ReturnType<typeof sdk.useMarkInboxThreadRead>>({ mutate: vi.fn(), isPending: false }),
    )

    renderThread()

    expect(screen.getByText('New submission')).toBeTruthy()
    expect(screen.getByText('New submission from Marcus Hill.')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Open page' })
    expect(link.getAttribute('href')).toBe('/landing-pages/page_1')
  })
})
