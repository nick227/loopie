import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLandingPageCompatibility, useLandingPageTemplates } from '@project/sdk'
import { PageToolbar } from './PageToolbar'

vi.mock('@project/sdk', () => ({
  useLandingPageTemplates: vi.fn(),
  useLandingPageCompatibility: vi.fn(),
}))

const TEMPLATES = [
  { id: 'studio', name: 'Creative studio', pageType: 'STUDIO' },
  { id: 'portfolio', name: 'Portfolio', pageType: 'STUDIO' },
  { id: 'webinar', name: 'Event signup', pageType: 'EVENT' },
]

function mockTemplates() {
  vi.mocked(useLandingPageTemplates).mockReturnValue({
    data: { pages: [{ data: TEMPLATES }] },
  } as unknown as ReturnType<typeof useLandingPageTemplates>)
}

function mockCompatibility(overrides?: { portfolioCompatible?: boolean }) {
  vi.mocked(useLandingPageCompatibility).mockReturnValue({
    isLoading: false,
    data: {
      data: {
        currentLayoutId: 'studio',
        currentPageType: 'STUDIO',
        layouts: [
          { layoutId: 'studio', pageType: 'STUDIO', compatible: true, blockers: [], warnings: [] },
          {
            layoutId: 'portfolio',
            pageType: 'STUDIO',
            compatible: overrides?.portfolioCompatible ?? false,
            blockers:
              (overrides?.portfolioCompatible ?? false)
                ? []
                : [
                    {
                      kind: 'slot',
                      key: 'gallery',
                      reason: 'Gallery is active here but Portfolio cannot present it.',
                    },
                  ],
            warnings: [],
          },
          { layoutId: 'webinar', pageType: 'EVENT', compatible: true, blockers: [], warnings: [] },
        ],
        pageTypes: [
          {
            pageType: 'STUDIO',
            compatible: true,
            blockers: [],
            warnings: [],
            supportedLayoutIds: ['studio', 'portfolio'],
          },
          {
            pageType: 'EVENT',
            compatible: true,
            blockers: [],
            warnings: [],
            supportedLayoutIds: ['webinar'],
          },
        ],
      },
    },
  } as unknown as ReturnType<typeof useLandingPageCompatibility>)
}

describe('PageToolbar', () => {
  it('keeps layout and style visible as separate compact controls', () => {
    mockTemplates()
    mockCompatibility()
    const onTemplate = vi.fn()
    const onTheme = vi.fn()

    render(
      <PageToolbar
        landingPageId="page-1"
        templateId="studio"
        theme={{
          primaryColor: '#FF2D6A',
          backgroundColor: '#FFFFFF',
          fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
          headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
          radius: '9999px',
        }}
        onTemplate={onTemplate}
        onTheme={onTheme}
      />,
    )

    expect(screen.getByText('Creative studio')).toBeInTheDocument()
    // The current theme matches the Carbon bundle exactly — shown as a quick label, not a raw select.
    expect(screen.getByText('Carbon')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Style/ }))
    fireEvent.click(screen.getByText('Shopfront'))
    expect(onTheme).toHaveBeenCalledWith(expect.objectContaining({ primaryColor: '#111111' }))
  })

  it('offers only same-Page-Type layouts, switches straight through when compatible', () => {
    mockTemplates()
    mockCompatibility({ portfolioCompatible: true })
    const onTemplate = vi.fn()

    render(
      <PageToolbar
        landingPageId="page-1"
        templateId="studio"
        templateSchema={undefined}
        theme={{ presetId: 'carbon', primaryColor: '#FF2D6A' }}
        onTemplate={onTemplate}
        onTheme={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Layout/ }))
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
    // Event signup belongs to a different Page Type — not offered as a same-type Layout switch.
    expect(screen.queryByText('Event signup')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Portfolio'))
    expect(onTemplate).toHaveBeenCalledWith('portfolio')
  })

  it('requires confirmation before switching to a Layout that would hide active content', () => {
    mockTemplates()
    mockCompatibility({ portfolioCompatible: false })
    const onTemplate = vi.fn()

    render(
      <PageToolbar
        landingPageId="page-1"
        templateId="studio"
        templateSchema={undefined}
        theme={{ presetId: 'carbon', primaryColor: '#FF2D6A' }}
        onTemplate={onTemplate}
        onTheme={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Layout/ }))
    fireEvent.click(screen.getByText('Portfolio'))

    // Blocked — not switched yet, a confirmation step appears instead.
    expect(onTemplate).not.toHaveBeenCalled()
    expect(screen.getByText("This will hide something you've added")).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Switch anyway' }))
    expect(onTemplate).toHaveBeenCalledWith('portfolio')
  })
})
