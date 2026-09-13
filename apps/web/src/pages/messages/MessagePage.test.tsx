import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessagePage } from './MessagePage'

// Regression coverage for the 2026-09-13 fix: this page was a generator stub
// (`JSON.stringify(item, null, 2)`) — a real customer clicking into any message saw a raw JSON
// dump, not a usable page. Now a real detail view built from existing message/audience data.
const mocks = vi.hoisted(() => ({
  message: {
    id: 'msg-1',
    channel: 'EMAIL',
    subject: 'Appointment reminder',
    body: 'Are you still good for Thursday?',
    audienceId: 'aud-1',
    status: 'DRAFT',
    recipientCount: 3,
    createdAt: '2026-09-01T00:00:00.000Z',
    scheduledAt: null as string | null,
    sentAt: null as string | null,
  },
  deleteMessage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@project/sdk', () => ({
  useMessage: () => ({ isLoading: false, data: { data: mocks.message } }),
  useAudience: () => ({ isLoading: false, data: { data: { id: 'aud-1', name: 'VIP Customers' } } }),
  useDeleteMessage: () => ({ mutateAsync: mocks.deleteMessage, isPending: false }),
}))

function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/messages/msg-1']}>
        <Routes>
          <Route path="/messages/:messageId" element={<MessagePage />} />
          <Route path="/messages" element={<p>arrived at messages list</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MessagePage: real detail view, not a JSON dump', () => {
  beforeEach(() => {
    mocks.deleteMessage.mockClear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders real subject/body/audience/status fields with no raw JSON', () => {
    show()
    expect(screen.getByRole('heading', { name: /Appointment reminder/ })).toBeInTheDocument()
    expect(screen.getByText('Are you still good for Thursday?')).toBeInTheDocument()
    expect(screen.getByText('VIP Customers')).toBeInTheDocument()
    expect(screen.getByText(/3 recipients/)).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.queryByText(/"id":\s*"msg-1"/)).not.toBeInTheDocument()
  })

  it('shows Edit/Send/Delete for a DRAFT message', () => {
    show()
    expect(screen.getByRole('link', { name: /Edit/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Send/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete message/ })).toBeInTheDocument()
  })

  it('deleting confirms, calls the delete mutation, and returns to the list', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Delete message/ }))
    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.deleteMessage).toHaveBeenCalledWith('msg-1')
    expect(await screen.findByText('arrived at messages list')).toBeInTheDocument()
  })

  it('hides Edit/Send/Delete and shows Performance instead for a SENT message', () => {
    mocks.message.status = 'SENT'
    mocks.message.sentAt = '2026-09-02T00:00:00.000Z'
    show()
    expect(screen.queryByRole('link', { name: /Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Send/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete message/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Performance/ })).toBeInTheDocument()
    mocks.message.status = 'DRAFT'
    mocks.message.sentAt = null
  })
})
