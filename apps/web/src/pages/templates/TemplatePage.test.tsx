import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useDeleteTemplate, useTemplate } from '@project/sdk'
import { TemplatePage } from './TemplatePage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useTemplate: vi.fn(),
  useDeleteTemplate: vi.fn(),
}))

function show() {
  render(
    <MemoryRouter initialEntries={['/templates/tpl-1']}>
      <Routes>
        <Route path="/templates/:templateId" element={<TemplatePage />} />
        <Route path="/templates" element={<p>arrived at templates list</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TemplatePage: real detail view, not a JSON dump', () => {
  it('renders real name/channel/subject/body fields with no raw JSON', () => {
    vi.mocked(useTemplate).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          id: 'tpl-1',
          name: 'Appointment reminder',
          channel: 'EMAIL',
          subject: 'See you soon',
          body: 'Just a reminder about your appointment.',
          purpose: 'Reminder',
          cta: null,
        },
      },
    } as unknown as ReturnType<typeof useTemplate>)
    vi.mocked(useDeleteTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteTemplate>)

    show()
    expect(screen.getByRole('heading', { name: /Appointment reminder/ })).toBeInTheDocument()
    expect(screen.getByText('See you soon')).toBeInTheDocument()
    expect(screen.getByText('Just a reminder about your appointment.')).toBeInTheDocument()
    expect(screen.queryByText(/"id":\s*"tpl-1"/)).not.toBeInTheDocument()
  })

  it('deletes the template and returns to the list', async () => {
    const deleteTemplate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useTemplate).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          id: 'tpl-1',
          name: 'Appointment reminder',
          channel: 'EMAIL',
          subject: null,
          body: 'Body',
          purpose: null,
          cta: null,
        },
      },
    } as unknown as ReturnType<typeof useTemplate>)
    vi.mocked(useDeleteTemplate).mockReturnValue({
      mutateAsync: deleteTemplate,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteTemplate>)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    show()
    fireEvent.click(screen.getByRole('button', { name: /Delete template/ }))
    await vi.waitFor(() => expect(deleteTemplate).toHaveBeenCalledWith('tpl-1'))
    await screen.findByText('arrived at templates list')
  })
})
