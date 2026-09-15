import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useUpdateLead } from '@project/sdk'
import { NextAction } from './ContactLeadCard'

// Regression coverage for a real bug found during 2026-09-14 lead-generation flow validation
// (e2e/lead-gen-flow-validation.spec.ts, run then discarded): when a Lead has no next-action
// note yet, the "click to add one" trigger rendered an empty <p> with no text at all — a real
// browser then measures that button as zero-size, making it genuinely unclickable, not just
// unlabeled. Found because Playwright's own actionability check refused to click it
// ("element is not visible"), not by reading the code.
vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useUpdateLead: vi.fn(),
}))

describe('NextAction', () => {
  it('renders a real, clickable prompt instead of an empty button when nothing is set yet', async () => {
    vi.mocked(useUpdateLead).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateLead>)
    const user = userEvent.setup()

    render(<NextAction leadId="lead-1" note={null} at={null} />)

    const trigger = screen.getByRole('button', { name: 'Add a next action' })
    expect(trigger).toBeVisible()
    await user.click(trigger)
    expect(screen.getByPlaceholderText('What happens next?')).toBeVisible()
  })

  it('shows the real note as the trigger once one is set, with no placeholder text mixed in', () => {
    vi.mocked(useUpdateLead).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateLead>)

    render(<NextAction leadId="lead-1" note="Call about the quote" at={null} />)

    expect(screen.getByText('Call about the quote')).toBeVisible()
    expect(screen.queryByText('Add a next action')).not.toBeInTheDocument()
  })
})
