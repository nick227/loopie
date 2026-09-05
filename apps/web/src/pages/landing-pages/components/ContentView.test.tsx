import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentView } from './ContentView'
import type { LayoutConfig, PageContent, TemplateSection } from './types'

vi.mock('@project/sdk', () => ({
  useAsset: vi.fn(() => ({ data: undefined })),
  useCreateAsset: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}))

describe('ContentView browser settings', () => {
  it('shows title and favicon for a layout with no content sections', () => {
    const onBrowserSettings = vi.fn()

    render(
      <ContentView
        content={{ browser: { title: 'Public title', favicon: { url: '/favicon.png' } } }}
        sections={[]}
        layoutConfig={{}}
        formId=""
        submitLabel=""
        successMessage=""
        onBrowserSettings={onBrowserSettings}
        onSlot={vi.fn()}
        onLayoutConfig={vi.fn()}
        onSubmitLabel={vi.fn()}
        onSuccessMessage={vi.fn()}
        onDetachForm={vi.fn()}
        onAddForm={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Page title')).toHaveValue('Public title')
    expect(screen.getByRole('img', { name: 'Current favicon' })).toHaveAttribute(
      'src',
      '/favicon.png',
    )
    expect(screen.getByRole('button', { name: /choose from media/i })).toBeVisible()

    fireEvent.change(screen.getByLabelText('Page title'), {
      target: { value: 'Updated public title' },
    })
    expect(onBrowserSettings).toHaveBeenCalledWith({
      title: 'Updated public title',
      favicon: { url: '/favicon.png' },
    })
  })
})

const SECTIONS: TemplateSection[] = [
  { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand', 'links'] },
  { key: 'hero', type: 'hero', order: 0, hideable: false, editable: ['headline'] },
  {
    key: 'testimonials',
    type: 'testimonials',
    order: 1,
    hideable: true,
    editable: ['headline', 'items'],
  },
  { key: 'form', type: 'form-embed', order: 2, hideable: true, editable: [] },
  { key: 'footer', type: 'footer', order: 3, hideable: false, editable: ['headline', 'body'] },
]

const CONTENT: PageContent = {
  nav: { brand: 'Acme', links: [] },
  hero: { headline: 'Welcome', body: '' },
  testimonials: {
    headline: 'What people say',
    items: [{ quote: 'Great work', author: 'Jane', role: '' }],
  },
}

function renderOutline(overrides: {
  content?: PageContent
  sections?: TemplateSection[]
  layoutConfig?: LayoutConfig
  formId?: string
  onSlot?: ReturnType<typeof vi.fn>
  onLayoutConfig?: ReturnType<typeof vi.fn>
  onDetachForm?: ReturnType<typeof vi.fn>
  onAddForm?: ReturnType<typeof vi.fn>
}) {
  const onSlot = overrides.onSlot ?? vi.fn()
  const onLayoutConfig = overrides.onLayoutConfig ?? vi.fn()
  const onDetachForm = overrides.onDetachForm ?? vi.fn()
  const onAddForm = overrides.onAddForm ?? vi.fn()
  render(
    <ContentView
      content={overrides.content ?? CONTENT}
      sections={overrides.sections ?? SECTIONS}
      layoutConfig={overrides.layoutConfig ?? {}}
      formId={overrides.formId ?? ''}
      submitLabel="Get in touch"
      successMessage="Thanks — we'll be in touch."
      onBrowserSettings={vi.fn()}
      onSlot={onSlot}
      onLayoutConfig={onLayoutConfig}
      onSubmitLabel={vi.fn()}
      onSuccessMessage={vi.fn()}
      onDetachForm={onDetachForm}
      onAddForm={onAddForm}
    />,
  )
  return { onSlot, onLayoutConfig, onDetachForm, onAddForm }
}

describe('ContentView section outline', () => {
  it('shows collapsed rows with a field count and expands one on click', () => {
    renderOutline({})

    const row = screen.getByRole('button', { name: /^Testimonials/ })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(within(row).getByText('3/5')).toBeInTheDocument()
    expect(within(row).getByText('Visible')).toBeInTheDocument()
    expect(screen.queryByLabelText('Testimonials Headline')).not.toBeInTheDocument()

    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Testimonials Headline')).toHaveValue('What people say')
  })

  it('marks a hidden section unmistakably and lets it be shown again', () => {
    const { onLayoutConfig } = renderOutline({
      layoutConfig: { sections: { testimonials: { hidden: true } } },
    })

    const row = screen.getByRole('button', { name: /^Testimonials/ })
    expect(within(row).getByText('Hidden')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show Testimonials' }))
    expect(onLayoutConfig).toHaveBeenCalledWith({
      sections: { testimonials: { hidden: false } },
    })
  })

  it('offers empty hideable sections through Add section instead of showing them as a row', () => {
    const content: PageContent = { ...CONTENT, testimonials: undefined }
    const { onSlot } = renderOutline({ content })

    expect(screen.queryByRole('button', { name: /^Testimonials/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add section/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Testimonials' }))
    expect(onSlot).toHaveBeenCalledWith('testimonials', { items: [] })
  })

  it('deletes an empty section immediately but confirms before clearing real content', () => {
    const { onSlot } = renderOutline({})
    fireEvent.click(screen.getByRole('button', { name: /^Testimonials/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Testimonials' }))

    expect(screen.getByText(/contains your content/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(onSlot).toHaveBeenCalledWith('testimonials', {})
  })

  it('renders nav link destinations as a preset select instead of a free URL field', () => {
    const content: PageContent = {
      ...CONTENT,
      nav: { brand: 'Acme', links: [{ label: 'See reviews', url: '#testimonials' }] },
    }
    renderOutline({ content })

    fireEvent.click(screen.getByRole('button', { name: /^Navigation/ }))
    const select = screen.getByLabelText('Goes to') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select).toHaveValue('#testimonials')
    expect(screen.getByRole('option', { name: 'Top of page' })).toBeInTheDocument()
  })

  it('shows an attached Form as its own collapsible row positioned before Footer', () => {
    renderOutline({ formId: 'form-1' })

    const rowTitles = screen
      .getAllByRole('button', { name: /^(Testimonials|Form|Footer)\b/ })
      .map((el) => el.textContent?.match(/^(Testimonials|Form|Footer)/)?.[1])
    expect(rowTitles).toEqual(['Testimonials', 'Form', 'Footer'])

    const formRow = screen.getByRole('button', { name: /^Form/ })
    expect(within(formRow).getByText('2/2')).toBeInTheDocument()
    fireEvent.click(formRow)
    expect(screen.getByLabelText('Submit button label')).toHaveValue('Get in touch')
  })

  it('positions Form purely from its schema order, not a hardcoded "before Footer" rule', () => {
    const sections: TemplateSection[] = SECTIONS.map((section) =>
      section.key === 'form' ? { ...section, order: -0.5 } : section,
    )
    renderOutline({ formId: 'form-1', sections })

    const rowTitles = screen
      .getAllByRole('button', { name: /^(Navigation|Hero|Testimonials|Form|Footer)\b/ })
      .map((el) => el.textContent?.match(/^(Navigation|Hero|Testimonials|Form|Footer)/)?.[1])
    expect(rowTitles).toEqual(['Navigation', 'Form', 'Hero', 'Testimonials', 'Footer'])
  })

  it('hides the Form section without detaching it, and confirms before a real delete', () => {
    const { onLayoutConfig, onDetachForm } = renderOutline({ formId: 'form-1' })

    fireEvent.click(screen.getByRole('button', { name: 'Hide Form' }))
    expect(onLayoutConfig).toHaveBeenCalledWith({ sections: { form: { hidden: true } } })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Form' }))
    expect(screen.getByText(/attached to this page/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(onDetachForm).toHaveBeenCalled()
  })

  it('offers Form through Add section when no form is attached, and it triggers create-inline', () => {
    const { onAddForm } = renderOutline({ formId: '' })

    expect(screen.queryByRole('button', { name: /^Form/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add section/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Form' }))
    expect(onAddForm).toHaveBeenCalled()
  })
})
