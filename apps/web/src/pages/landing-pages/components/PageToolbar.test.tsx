import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLandingPageTemplates } from '@project/sdk'
import { PageToolbar } from './PageToolbar'

vi.mock('@project/sdk', () => ({ useLandingPageTemplates: vi.fn() }))

describe('PageToolbar', () => {
  it('keeps layout and theme controls inside the Appearance disclosure', () => {
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

    expect(screen.queryByRole('dialog', { name: 'Page appearance' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Appearance/ }))
    expect(screen.getByRole('dialog', { name: 'Page appearance' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Layout'), { target: { value: 'webinar' } })
    expect(onTemplate).toHaveBeenCalledWith('webinar')

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'shopfront' } })
    expect(onTheme).toHaveBeenCalledWith(expect.objectContaining({ presetId: 'shopfront' }))
  })

  it('closes the disclosure with Escape', () => {
    vi.mocked(useLandingPageTemplates).mockReturnValue({
      data: { pages: [{ data: [{ id: 'studio', name: 'Studio' }] }] },
    } as unknown as ReturnType<typeof useLandingPageTemplates>)

    render(
      <PageToolbar
        templateId="studio"
        templateSchema={undefined}
        theme={{}}
        onTemplate={vi.fn()}
        onTheme={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Appearance/ }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Page appearance' })).not.toBeInTheDocument()
  })
})
