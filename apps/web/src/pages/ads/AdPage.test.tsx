import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as sdk from '@project/sdk'
import { dateInput, toStartIso } from '@/lib/adOrder'
import { AdPage } from './AdPage'

vi.mock('@project/sdk', async () => {
  const actual = await vi.importActual('@project/sdk')
  return {
    ...(actual as object),
    useAdvertisement: vi.fn(),
    useAdRuns: vi.fn(),
    useAsset: vi.fn(() => ({ data: undefined })),
    useLandingPages: vi.fn(() => ({ data: { pages: [] } })),
    usePlatformConnection: vi.fn(() => ({
      data: { data: { defaultCountry: 'US', status: 'CONNECTED' } },
    })),
    useCreateAsset: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useUpdateAdvertisement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useCreateAdRun: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    usePauseAdRun: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useResumeAdRun: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useEndAdRun: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useSyncAdRun: vi.fn(() => ({ mutate: vi.fn(), isPending: false, variables: undefined })),
    useUpdateAdRunBudget: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useUpdateAdRunSchedule: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useUpdateAdRunTargeting: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useReplaceAdRunCreative: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
    useReplaceAdRunDestination: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    })),
  }
})

function stub<T>(value: object): T {
  return value as T
}

function mockAd(runs: object[], updatedAt = '2026-08-01T00:00:00.000Z') {
  vi.mocked(sdk.useAdvertisement).mockReturnValue(
    stub<ReturnType<typeof sdk.useAdvertisement>>({
      isLoading: false,
      data: {
        data: { id: 'ad_123', name: 'Test Ad Name', assetIds: ['asset_1'], updatedAt },
      },
    }),
  )
  vi.mocked(sdk.useAdRuns).mockReturnValue(
    stub<ReturnType<typeof sdk.useAdRuns>>({ data: { data: runs } }),
  )
  vi.mocked(sdk.useAsset).mockReturnValue(
    stub<ReturnType<typeof sdk.useAsset>>({
      data: {
        data: {
          id: 'asset_1',
          type: 'IMAGE',
          name: 'Hero',
          url: '/uploads/hero.png',
          placements: [],
        },
      },
    }),
  )
  vi.mocked(sdk.useLandingPages).mockReturnValue(
    stub<ReturnType<typeof sdk.useLandingPages>>({
      data: {
        pages: [{ data: [{ id: 'lp1', name: 'Book a Detail', status: 'PUBLISHED' }] }],
      },
    }),
  )
}

describe('AdPage', () => {
  it('renders a loading skeleton initially', () => {
    vi.mocked(sdk.useAdvertisement).mockReturnValue(
      stub<ReturnType<typeof sdk.useAdvertisement>>({ isLoading: true, data: undefined }),
    )
    vi.mocked(sdk.useAdRuns).mockReturnValue(
      stub<ReturnType<typeof sdk.useAdRuns>>({ data: undefined }),
    )

    const { container } = render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(container.querySelector('.animate-pulse')).toBeTruthy()
    expect(screen.queryByText('Platform Runs')).toBeNull()
  })

  it('keeps setup as intent-only destinations', async () => {
    mockAd([])

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('checkbox', { name: 'Facebook' })).toBeTruthy()
    expect(screen.getByText('Feed')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Google' })).toBeTruthy()
    expect(screen.getByText('Display')).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'YouTube' })).toBeNull()
    expect(screen.getByText('Book a Detail')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull()
    expect(screen.queryByText('/day')).toBeNull()
    expect(screen.queryByText('A running buy stays on until you pause it.')).toBeNull()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Facebook' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Media order · Facebook' })).toBeTruthy()
    expect(screen.getByText('Facebook Feed')).toBeTruthy()
    expect(screen.getByText('Get Leads · Lead created')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send paused draft to Facebook' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByText(/No advertising spend starts from this action/)).toBeTruthy()
    // The authorization sentence — generated live from the in-progress order, before send.
    expect(
      screen.getByText(/^Spend \$25\.00\/day to Get Leads from US on Facebook Feed/),
    ).toBeTruthy()
    expect(screen.getByText(/Until manually stopped/)).toBeTruthy()
  })

  function sentRun(overrides: object = {}) {
    return {
      id: 'run_1',
      platform: 'META',
      placement: 'FEED',
      status: 'PENDING',
      budget: 25,
      spend: 142.18,
      impressions: 12400,
      clicks: 341,
      leads: 18,
      sales: 4,
      revenue: 4850,
      conversions: 0,
      externalAdId: 'ext_1',
      lastSyncedAt: '2026-08-10T00:00:00.000Z',
      previewUrl: 'https://facebook.com/preview',
      managerUrl: 'https://facebook.com/adsmanager',
      orderSnapshot: {
        dailyBudget: 25,
        where: 'Facebook Feed',
        country: 'US',
        location: 'Austin + 25 miles',
        startDate: '2026-08-29',
        endDate: '',
        destinationUrl: '/p/book',
        mediaName: 'Hero',
      },
      ...overrides,
    }
  }

  it('shows a sent Facebook run as a draft snapshot with live performance', () => {
    mockAd([sentRun()], '2026-08-05T00:00:00.000Z')

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Draft sent')).toBeTruthy()
    expect(screen.getByText(/Facebook status: Paused/)).toBeTruthy()
    expect(screen.getByText(/Austin \+ 25 miles/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Preview' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open Ads Manager' })).toBeTruthy()
    expect(screen.queryByText('Running')).toBeNull()
    expect(screen.getByText(/Versions already sent/)).toBeTruthy()
    // Performance is visible on the run itself, not only on the ads list row.
    expect(screen.getByText('$142.18')).toBeTruthy()
    expect(screen.getByText('$4,850.00')).toBeTruthy()
    expect(screen.getByText('18')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    // Sent before the advertisement was last updated — no stale/relaunch prompt.
    expect(screen.queryByText(/changed since the Facebook version was sent/)).toBeNull()
  })

  it('shows the frozen authorization sentence and revision number for a sent run', () => {
    mockAd([
      sentRun({
        mediaOrderRevision: {
          id: 'rev_1',
          revision: 1,
          goal: 'Get Leads',
          successEvent: 'Lead created',
          country: 'US',
          locationNote: 'Austin + 25 miles',
          dailyBudgetMinor: 2500,
          currency: 'USD',
          startAt: '2026-08-29T00:00:00.000Z',
          endAt: null,
          destinationLandingPageId: null,
          destinationLandingPageVersionId: null,
          assetIds: ['asset_1'],
          accountName: 'Acme Ads',
          accountCurrency: 'USD',
          accountTimezone: 'America/Chicago',
          adAccountId: 'act_1',
          contentHash: 'abc123',
          createdAt: '2026-08-10T00:00:00.000Z',
        },
      }),
    ])

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Advertisement · media order revision 1')).toBeTruthy()
    expect(
      screen.getByText(
        /^Spend \$25\.00\/day to Get Leads from US · Austin \+ 25 miles on Facebook Feed/,
      ),
    ).toBeTruthy()
    expect(screen.getByText(/Acme Ads\.$/)).toBeTruthy()
  })

  it('shows Pause and End for an active, remote-capable run, gated behind a confirm', async () => {
    mockAd([sentRun({ status: 'ACTIVE' })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: { activate: true, pause: true, end: true },
          },
        },
      }),
    )
    const pauseMutateAsync = vi.fn()
    vi.mocked(sdk.usePauseAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.usePauseAdRun>>({
        mutate: vi.fn(),
        mutateAsync: pauseMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'End' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(confirmSpy).toHaveBeenCalled()
    // The user declined the confirm — the mutation must never fire.
    expect(pauseMutateAsync).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('resume requires confirming that it activates real spend, then calls the real mutation', async () => {
    mockAd([sentRun({ status: 'PAUSED' })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: { activate: true, pause: true, end: true },
          },
        },
      }),
    )
    const resumeMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_1' } })
    vi.mocked(sdk.useResumeAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.useResumeAdRun>>({
        mutate: vi.fn(),
        mutateAsync: resumeMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation((message) => {
      expect(message).toMatch(/activates real ad spend/)
      return true
    })

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(resumeMutateAsync).toHaveBeenCalledWith({ advertisementId: 'ad_123', runId: 'run_1' })

    confirmSpy.mockRestore()
  })

  it('offers no pause/resume/end controls when the connector cannot remotely mutate this run', () => {
    mockAd([sentRun({ status: 'ACTIVE' })])
    // No capabilities.pause/activate/end set — everything defaults to false.
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: {} } },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'End' })).toBeNull()
    expect(screen.getByText(/View only until the platform can be updated/)).toBeTruthy()
  })

  it('edits budget through a two-step confirm, showing requested vs effective and the real commitment', async () => {
    mockAd([sentRun({ effectiveBudget: 25 })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: { editBudget: true },
          },
        },
      }),
    )
    const budgetMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_1' } })
    vi.mocked(sdk.useUpdateAdRunBudget).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunBudget>>({
        mutate: vi.fn(),
        mutateAsync: budgetMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('LOOPIE ordered: $25.00/day')).toBeTruthy()
    expect(screen.getByText('Facebook effective: $25.00/day')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Edit budget' }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '35')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('$25.00/day → $35.00/day')).toBeTruthy()
    expect(screen.getByText('This changes real advertising spend.')).toBeTruthy()
    expect(screen.getByText('Facebook controls actual delivery and charges.')).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Change to $35.00/day' }))
    expect(budgetMutateAsync).toHaveBeenCalledWith({
      advertisementId: 'ad_123',
      runId: 'run_1',
      dailyBudget: 35,
    })
  })

  it('keeps the budget modal open and shows the error when the mutation is rejected', async () => {
    mockAd([sentRun({ effectiveBudget: 25 })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: { editBudget: true } },
        },
      }),
    )
    vi.mocked(sdk.useUpdateAdRunBudget).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunBudget>>({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockRejectedValue(new Error('Meta rejected the budget change')),
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Edit budget' }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '35')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Change to/ }))

    expect(await screen.findByText('Meta rejected the budget change')).toBeTruthy()
    // Still open — Cancel is only reachable while the modal is up.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('offers no Edit budget control when the connector cannot edit budget remotely', () => {
    mockAd([sentRun()])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: {} } },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Edit budget' })).toBeNull()
    // The comparison itself still shows — it's informational regardless of edit capability.
    expect(screen.getByText(/LOOPIE ordered: \$/)).toBeTruthy()
  })

  it('edits schedule through a two-step confirm, showing requested vs effective and the real commitment', async () => {
    mockAd([
      sentRun({
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: null,
        effectiveStartDate: '2026-09-01T00:00:00.000Z',
        effectiveEndDate: null,
      }),
    ])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: { editSchedule: true },
          },
        },
      }),
    )
    const scheduleMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_1' } })
    vi.mocked(sdk.useUpdateAdRunSchedule).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunSchedule>>({
        mutate: vi.fn(),
        mutateAsync: scheduleMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/LOOPIE ordered: .*until manually stopped/)).toBeTruthy()
    expect(screen.getByText(/Facebook effective: .*until manually stopped/)).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Edit schedule' }))
    const dialog = screen.getByRole('dialog')
    const startInput = within(dialog).getByLabelText('Starts')
    fireEvent.change(startInput, { target: { value: '2026-09-05' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('This changes when Facebook actually delivers.')).toBeTruthy()
    expect(screen.getByText('Facebook controls exact timing within the day.')).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Change schedule' }))
    expect(scheduleMutateAsync).toHaveBeenCalledWith({
      advertisementId: 'ad_123',
      runId: 'run_1',
      startDate: toStartIso('2026-09-05'),
      endDate: null,
    })
  })

  it('keeps the schedule modal open and shows the error when the mutation is rejected', async () => {
    mockAd([sentRun({ startDate: '2026-09-01T00:00:00.000Z', endDate: null })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: { editSchedule: true } },
        },
      }),
    )
    vi.mocked(sdk.useUpdateAdRunSchedule).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunSchedule>>({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockRejectedValue(new Error('Meta rejected the schedule change')),
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Edit schedule' }))
    const dialog = screen.getByRole('dialog')
    const startInput = within(dialog).getByLabelText('Starts')
    fireEvent.change(startInput, { target: { value: '2026-09-05' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change schedule' }))

    expect(await screen.findByText('Meta rejected the schedule change')).toBeTruthy()
    // Still open — Cancel is only reachable while the modal is up.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('supports clearing an end date to an explicit no-end schedule', async () => {
    mockAd([
      sentRun({ startDate: '2026-09-01T00:00:00.000Z', endDate: '2026-09-30T23:59:59.999Z' }),
    ])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: { editSchedule: true } },
        },
      }),
    )
    const scheduleMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_1' } })
    vi.mocked(sdk.useUpdateAdRunSchedule).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunSchedule>>({
        mutate: vi.fn(),
        mutateAsync: scheduleMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Edit schedule' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByText('No end date — run until manually stopped'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change schedule' }))

    expect(scheduleMutateAsync).toHaveBeenCalledWith({
      advertisementId: 'ad_123',
      runId: 'run_1',
      startDate: toStartIso(dateInput(new Date('2026-09-01T00:00:00.000Z'))),
      endDate: null,
    })
  })

  it('offers no Edit schedule control when the connector cannot edit schedule remotely', () => {
    mockAd([sentRun({ startDate: '2026-09-01T00:00:00.000Z', endDate: null })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: {} } },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Edit schedule' })).toBeNull()
    // The comparison itself still shows — it's informational regardless of edit capability.
    expect(screen.getByText(/LOOPIE ordered: .*until manually stopped/)).toBeTruthy()
  })

  it('names the real edit consequence for in-place fields (budget, schedule) before the user opens an editor', () => {
    mockAd(
      [sentRun({ effectiveBudget: 25, startDate: '2026-09-01T00:00:00.000Z', endDate: null })],
      '2026-08-05T00:00:00.000Z',
    )
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: {
              editBudget: true,
              editSchedule: true,
              editModes: {
                budget: 'IN_PLACE',
                schedule: 'IN_PLACE',
                creative: 'RECREATE',
                destination: 'RECREATE',
                targeting: 'IN_PLACE',
              },
            },
          },
        },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    // Shown for the budget, schedule, and targeting blocks, before any editor is ever opened.
    expect(screen.getAllByText('Updates the current Facebook run directly.')).toHaveLength(3)
  })

  it('names the real edit consequence for the recreate path (relaunch) before the user relaunches', () => {
    mockAd([sentRun()], '2026-08-20T00:00:00.000Z') // advertisement changed after send — banner shows
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: { editModes: { creative: 'RECREATE' } },
          },
        },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(
        'Creates a new Facebook version — the current run keeps delivering until you switch.',
      ),
    ).toBeTruthy()
  })

  it('drives edit-mode consequence text purely from capabilities, not a platform-name branch', () => {
    mockAd(
      [sentRun({ platform: 'GOOGLE', placement: 'DISPLAY', effectiveBudget: 25 })],
      '2026-08-05T00:00:00.000Z',
    )
    // Deliberately the inverse of Meta's real classification, on a platform this component never
    // special-cases by name — if this renders correctly, the text came from capabilities.editModes,
    // not a hidden `platform === 'META'` conditional.
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: {
            defaultCountry: 'US',
            status: 'CONNECTED',
            capabilities: { editModes: { budget: 'RECREATE', schedule: 'NONE' } },
          },
        },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(
        'Creates a new Google version — the current run keeps delivering until you switch.',
      ),
    ).toBeTruthy()
    // Schedule (explicitly NONE) and targeting (unset, defaults to NONE) both show it.
    expect(screen.getAllByText("Can't be changed from LOOPIE yet.")).toHaveLength(2)
  })

  it('edits targeting through a two-step confirm, showing requested vs effective and the real commitment', async () => {
    mockAd([
      sentRun({
        country: 'US',
        locationNote: null,
        radiusMiles: null,
        effectiveCountry: 'US',
        effectiveLocationNote: null,
        effectiveRadiusMiles: null,
      }),
    ])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: { editAudience: true } },
        },
      }),
    )
    const targetingMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_1' } })
    vi.mocked(sdk.useUpdateAdRunTargeting).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunTargeting>>({
        mutate: vi.fn(),
        mutateAsync: targetingMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('LOOPIE ordered: US')).toBeTruthy()
    expect(screen.getByText('Facebook effective: US')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Edit targeting' }))
    const dialog = screen.getByRole('dialog')
    const locationInput = within(dialog).getByPlaceholderText('Austin, TX')
    await userEvent.type(locationInput, 'Austin, TX')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('This changes who Facebook shows this ad to.')).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Change targeting' }))
    expect(targetingMutateAsync).toHaveBeenCalledWith({
      advertisementId: 'ad_123',
      runId: 'run_1',
      country: 'US',
      locationNote: 'Austin, TX',
      radiusMiles: 10,
    })
  })

  it('keeps the targeting modal open and shows the error when the mutation is rejected', async () => {
    mockAd([sentRun({ country: 'US' })])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: {
          data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: { editAudience: true } },
        },
      }),
    )
    vi.mocked(sdk.useUpdateAdRunTargeting).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunTargeting>>({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockRejectedValue(new Error('Meta rejected the targeting change')),
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Edit targeting' }))
    const dialog = screen.getByRole('dialog')
    const countryInput = within(dialog).getByDisplayValue('US')
    await userEvent.clear(countryInput)
    await userEvent.type(countryInput, 'CA')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change targeting' }))

    expect(await screen.findByText('Meta rejected the targeting change')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('replaces creative through a confirm, calling the real mutation', async () => {
    mockAd([sentRun()], '2026-08-01T00:00:00.000Z')
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: {} } },
      }),
    )
    const replaceCreativeMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_2' } })
    vi.mocked(sdk.useReplaceAdRunCreative).mockReturnValue(
      stub<ReturnType<typeof sdk.useReplaceAdRunCreative>>({
        mutate: vi.fn(),
        mutateAsync: replaceCreativeMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation((message) => {
      expect(message).toMatch(/current one keeps running until it's ready/)
      return true
    })

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Replace creative' }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(replaceCreativeMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1' }),
    )

    confirmSpy.mockRestore()
  })

  it('replaces destination through a two-step picker, calling the real mutation with the new page', async () => {
    mockAd([sentRun({ destinationLandingPageId: 'lp1' })], '2026-08-01T00:00:00.000Z')
    vi.mocked(sdk.useLandingPages).mockReturnValue(
      stub<ReturnType<typeof sdk.useLandingPages>>({
        data: {
          pages: [
            {
              data: [
                { id: 'lp1', name: 'Book a Detail', status: 'PUBLISHED' },
                { id: 'lp2', name: 'Second Page', status: 'PUBLISHED' },
              ],
            },
          ],
        },
      }),
    )
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: {} } },
      }),
    )
    const replaceDestinationMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'run_2' } })
    vi.mocked(sdk.useReplaceAdRunDestination).mockReturnValue(
      stub<ReturnType<typeof sdk.useReplaceAdRunDestination>>({
        mutate: vi.fn(),
        mutateAsync: replaceDestinationMutateAsync,
        isPending: false,
        variables: undefined,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Change destination' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'lp2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Book a Detail → Second Page')).toBeTruthy()
    expect(
      screen.getByText('The current version keeps running until this one is ready.'),
    ).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace destination' }))
    expect(replaceDestinationMutateAsync).toHaveBeenCalledWith({
      advertisementId: 'ad_123',
      runId: 'run_1',
      destinationLandingPageId: 'lp2',
      idempotencyKey: expect.any(String),
    })
  })

  it('shows provider review issues when the platform reports them', () => {
    mockAd([sentRun({ providerIssues: ['Ad disapproved: Missing disclaimer'] })])

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Facebook review')).toBeTruthy()
    expect(screen.getByText('Ad disapproved: Missing disclaimer')).toBeTruthy()
  })

  it('shows the real synced provider state and last-synced time once a sync has actually run', () => {
    mockAd(
      [
        sentRun({
          providerState: 'LIVE',
          providerStateRaw: 'ACTIVE',
          syncHealth: 'CURRENT',
          reach: 9800,
        }),
      ],
      '2026-08-05T00:00:00.000Z',
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    // The real pulled state ("Live") wins over the old not-yet-synced heuristic ("Paused").
    expect(screen.getByText(/Facebook status: Live/)).toBeTruthy()
    expect(screen.getByText(/Last synced/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sync Facebook now' })).toBeTruthy()
    // LOOPIE's own order state stays visible and unblended with the provider's.
    expect(screen.getByText('Draft sent')).toBeTruthy()
  })

  it('shows budget drift between what LOOPIE requested and what the platform reports', () => {
    mockAd([sentRun({ syncHealth: 'CURRENT', providerState: 'LIVE', effectiveBudget: 40 })])

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('LOOPIE ordered: $25.00/day')).toBeTruthy()
    expect(screen.getByText('Facebook effective: $40.00/day')).toBeTruthy()
  })

  it('surfaces a failed sync clearly, without discarding the last good data', () => {
    mockAd([
      sentRun({
        syncHealth: 'FAILED',
        syncError: 'Meta Graph request failed',
        providerState: 'LIVE',
      }),
    ])

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sync failed: Meta Graph request failed')).toBeTruthy()
    // Spend/leads from the last successful sync are still shown, not blanked by the failure.
    expect(screen.getByText('$142.18')).toBeTruthy()
  })

  it('offers to connect the platform instead of a mysterious pseudo-send when disconnected', async () => {
    mockAd([])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'DISCONNECTED' } },
      }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Facebook' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Needs attention')).toBeTruthy()
    expect(screen.getByText('Facebook is not connected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Connect Facebook' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Send paused draft/ })).toBeNull()
  })

  it('offers to create a page instead of allowing a paid run with no destination', async () => {
    mockAd([])
    vi.mocked(sdk.usePlatformConnection).mockReturnValue(
      stub<ReturnType<typeof sdk.usePlatformConnection>>({
        data: { data: { defaultCountry: 'US', status: 'CONNECTED' } },
      }),
    )
    vi.mocked(sdk.useLandingPages).mockReturnValue(
      stub<ReturnType<typeof sdk.useLandingPages>>({ data: { pages: [] } }),
    )

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Facebook' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Needs attention')).toBeTruthy()
    expect(screen.getByText('No destination selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create page' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Send paused draft/ })).toBeNull()
  })

  it('prompts a new version when the advertisement changed after the run was sent', () => {
    mockAd([sentRun()], '2026-08-20T00:00:00.000Z')

    render(
      <MemoryRouter initialEntries={['/ads/ad_123']}>
        <AdPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/changed since the Facebook version was sent/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create new Facebook version' })).toBeTruthy()
  })
})
