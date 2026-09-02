import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLandingPageTemplates } from '@project/sdk'
import { PageToolbar } from './PageToolbar'

vi.mock('@project/sdk', () => ({ useLandingPageTemplates: vi.fn() }))

describe('PageToolbar', () => {
  it('keeps layout and theme visible as separate compact controls', () => {
    vi.mocked(useLandingPageTemplates).mockReturnValue({
      data: {
        pages: [
          {
            data: [
              { id: 'studio', name: 'Studio' },
              { id: 'webinar', name: 'Webinar signup' },
            ],
          },
        ],
      },
    } as unknown as ReturnType<typeof useLandingPageTemplates>)
    const onTemplate = vi.fn()
    const onTheme = vi.fn()

    render(
      <PageToolbar
        templateId="studio"
        templateSchema={undefined}
        theme={{ presetId: 'carbon', primaryColor: '#0B3D91' }}
        onTemplate={onTemplate}
        onTheme={onTheme}
      />,
    )

    expect(screen.getByLabelText('Layout')).toHaveValue('studio')
    expect(screen.getByLabelText('Theme')).toHaveValue('carbon')
    expect(screen.getByText('Layout')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Layout'), { target: { value: 'webinar' } })
    expect(onTemplate).toHaveBeenCalledWith('webinar')

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'shopfront' } })
    expect(onTheme).toHaveBeenCalledWith(expect.objectContaining({ presetId: 'shopfront' }))
  })
})
