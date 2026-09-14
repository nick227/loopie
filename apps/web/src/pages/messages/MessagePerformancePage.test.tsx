import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MessagePerformancePage } from './MessagePerformancePage'

// Regression coverage for the 2026-09-14 fix: this page was a generator stub
// (`JSON.stringify(item, null, 2)`) — a real customer clicking "Performance" on a sent message
// saw a raw JSON dump. Now a real stat view. Also asserts the honesty distinction: sent/
// delivered/replied/leads/sales/revenue are real backend counts, but opened/clicked/unsubscribed
// are hardcoded 0 server-side (no tracking-pixel/link-tracking/unsubscribe-webhook provider
// wired yet) — showing those as a bare "0" would misread as "zero people opened this," a false
// claim, instead of the true one, "we don't track this yet."
vi.mock('@project/sdk', () => ({
  useMessage: () => ({
    isLoading: false,
    data: {
      data: {
        id: 'msg-1',
        channel: 'EMAIL',
        subject: 'Appointment reminder',
        body: 'Are you still good for Thursday?',
        status: 'SENT',
      },
    },
  }),
  useMessagePerformance: () => ({
    isLoading: false,
    data: {
      data: {
        sent: 42,
        delivered: 42,
        opened: 0,
        clicked: 0,
        replied: 3,
        unsubscribed: 0,
        leads: 2,
        sales: 1,
        revenue: 150,
      },
    },
  }),
}))

function show() {
  render(
    <MemoryRouter initialEntries={['/messages/msg-1/performance']}>
      <Routes>
        <Route path="/messages/:messageId/performance" element={<MessagePerformancePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MessagePerformancePage: real stats, not a JSON dump', () => {
  it('renders real backend-derived counts with no raw JSON', () => {
    show()
    expect(screen.getAllByText('42')).toHaveLength(2)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.queryByText(/"sent":\s*42/)).not.toBeInTheDocument()
  })

  it('labels untracked metrics honestly instead of a misleading zero', () => {
    show()
    expect(screen.getAllByText('Not tracked yet')).toHaveLength(3)
    expect(screen.getByText('No open-tracking provider wired yet')).toBeInTheDocument()
    expect(screen.getByText('No link-tracking provider wired yet')).toBeInTheDocument()
    expect(screen.getByText('No unsubscribe-webhook provider wired yet')).toBeInTheDocument()
  })
})
