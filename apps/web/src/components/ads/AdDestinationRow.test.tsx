import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PageRunRow } from './AdDestinationRow'

// Regression coverage for a real bug found during 2026-09-14 end-to-end ads-flow validation
// (a throwaway Playwright run against the live dev server, discarded after): publishing a
// PAGE-placement AdRun via /ads only makes the ad *eligible* for that page — a real
// LandingPageAdSlotAssignment (created separately, from the page's own editor) is required before
// anything actually renders. Confirmed live: a page with an ACTIVE run here showed no trace of the
// ad at all (no "Sponsored" label, no CTA) until a slot assignment existed. The old copy, "On this
// page," read as present-tense fact ("your ad is showing here") rather than eligibility.
describe('PageRunRow', () => {
  it('describes eligibility, not confirmed visibility, and links to the page to manage placement', () => {
    render(<PageRunRow label="Home" pageId="page-1" />)

    expect(screen.queryByText('On this page')).not.toBeInTheDocument()
    expect(screen.getByText(/Eligible for this page/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage on page' })).toHaveAttribute(
      'href',
      '/landing-pages/page-1',
    )
  })

  it('omits the manage link when no pageId is available', () => {
    render(<PageRunRow label="Home" onPause={vi.fn()} />)
    expect(screen.queryByRole('link', { name: 'Manage on page' })).not.toBeInTheDocument()
  })
})
