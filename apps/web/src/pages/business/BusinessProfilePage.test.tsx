import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useBusinessProfile, useCurrentUser, useSendBusinessProfileMessage } from '@project/sdk'
import { BusinessProfilePage } from './BusinessProfilePage'

vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useBusinessProfile: vi.fn(),
  useCurrentUser: vi.fn(),
  useSendBusinessProfileMessage: vi.fn(),
}))

describe('BusinessProfilePage', () => {
  it('leads with the business artwork and contact details without rendering River activity', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      isPending: false,
      data: undefined,
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useSendBusinessProfileMessage).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useSendBusinessProfileMessage>)
    vi.mocked(useBusinessProfile).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: {
          business: {
            id: 'business-1',
            name: 'Northline Studio',
            industry: 'Brand design',
            location: 'Austin, Texas',
            targetAudience: 'independent hospitality brands',
            description: 'Identity systems and campaigns with a sense of place.',
            phone: '+1 512 555 0188',
            email: 'hello@northline.example',
            hours: 'Monday–Friday, 9–5',
            logoUrl: '/media/logo.png',
            galleryImageUrls: ['/media/hero.png', '/media/work-2.png'],
            socialProfiles: [],
            identityCompletedAt: null,
            slug: 'northline-studio',
            publicProfileUrl: null,
          },
          followerCount: 24,
          viewerIsFollowing: false,
          isOwnProfile: false,
          featured: null,
        },
      },
    } as unknown as ReturnType<typeof useBusinessProfile>)

    render(
      <MemoryRouter initialEntries={['/b/northline-studio']}>
        <Routes>
          <Route path="/b/:slug" element={<BusinessProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Northline Studio', level: 1 })).toBeInTheDocument()
    expect(screen.getByAltText('Featured work by Northline Studio')).toHaveAttribute(
      'src',
      expect.stringContaining('/media/hero.png'),
    )
    expect(screen.getAllByText('Austin, Texas')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /hello@northline\.example/i })).toHaveAttribute(
      'href',
      'mailto:hello@northline.example',
    )
    expect(screen.getByRole('link', { name: /512 555 0188/i })).toHaveAttribute(
      'href',
      'tel:+1 512 555 0188',
    )
    expect(screen.queryByText(/followers?/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/latest from/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Featured')).not.toBeInTheDocument()
  })
})
