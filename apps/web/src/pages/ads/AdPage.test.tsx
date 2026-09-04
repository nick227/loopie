// Rewritten 2026-08-31 against the actual current AdPage/AdEditor/AdDestinations/
// AdDestinationRow/AdBuyReview implementation (the inline "on-page destinations" editor from
// commit 1a3cc1e, "Unify new-ad and edit into one centered editor... Drop the add-platform modal
// and cryptic provision/run copy"). The previous version of this file tested an unrelated, older
// two-step Save/Continue + platform-checkbox wizard that no longer exists anywhere in this
// codebase — see CLAUDE.md's Concurrent-Session Collision precedent; this file was bulk-added by
// a later commit that never reconciled with the redesign. Every scenario name below is preserved
// from that file's intent (budget/schedule/targeting edit, replace creative/destination,
// pause/resume/end gating, drift, sync health, provider issues, stale/relaunch, disconnected
// platform) but rewritten against real DOM structure, verified by actually running the suite.
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as sdk from '@project/sdk'
import { AdPage } from './AdPage'

// EmbedModal (rendered unconditionally, reserved-but-disabled, inside AdEditor's header actions)
// calls @tanstack/react-query's useMutation directly rather than through a mockable @project/sdk
// hook — see Shell.test.tsx's note that this codebase deliberately has no global
// QueryClientProvider test wrapper, so any real query/mutation hook needs its own mock here.
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...(actual as object),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
      data: undefined,
      error: null,
    })),
  }
})

vi.mock('@project/sdk', async () => {
  const actual = await vi.importActual('@project/sdk')
  return {
    ...(actual as object),
    useAdvertisement: vi.fn(),
    useAdRuns: vi.fn(),
    useAsset: vi.fn(() => ({ data: undefined })),
    useLandingPages: vi.fn(() => ({ data: { pages: [] } })),
    usePlatformConnection: vi.fn(() => ({
      data: { data: { defaultCountry: 'US', status: 'CONNECTED', capabilities: {} } },
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
    usePublishAdvertisement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useDeleteAdvertisement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useRiverPosts: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
    useCreateRiverPost: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
    })),
  }
})

function stub<T>(value: object): T {
  return value as T
}

// A full-capability Meta-style connector — activate/pause/end plus IN_PLACE budget/schedule/
// targeting, RECREATE creative/destination. Individual tests narrow this down to prove gating.
const FULL_CAPABILITIES = {
  oauth: true,
  mappingFields: ['adAccount', 'page', 'defaultCountry'],
  pushDraft: true,
  pullSpend: true,
  pullStatus: true,
  activate: true,
  pause: true,
  end: true,
  editBudget: true,
  editSchedule: true,
  editAudience: false,
  editModes: {
    budget: 'IN_PLACE',
    schedule: 'IN_PLACE',
    targeting: 'IN_PLACE',
    creative: 'RECREATE',
    destination: 'RECREATE',
  },
}

function mockConnection(overrides: Record<string, unknown> = {}) {
  vi.mocked(sdk.usePlatformConnection).mockReturnValue(
    stub<ReturnType<typeof sdk.usePlatformConnection>>({
      data: {
        data: {
          defaultCountry: 'US',
          status: 'CONNECTED',
          capabilities: FULL_CAPABILITIES,
          ...overrides,
        },
      },
    }),
  )
}

function mockRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run_1',
    advertisementId: 'ad_123',
    platform: 'META',
    placement: 'FEED',
    status: 'ACTIVE',
    budget: 25,
    spend: 12.5,
    impressions: 4200,
    reach: 3100,
    clicks: 84,
    conversions: 3,
    leads: 5,
    sales: 1,
    revenue: 400,
    syncHealth: 'CURRENT',
    trackedUrl: 'https://loopie.test/r/adrun/run_1',
    createdAt: '2026-08-01T00:00:00.000Z',
    externalAdId: 'ext_ad_1',
    country: 'US',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: null,
    lastSyncedAt: '2026-08-05T00:00:00.000Z',
    ...overrides,
  }
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

function renderAdPage() {
  return render(
    <MemoryRouter initialEntries={['/ads/ad_123']}>
      <AdPage />
    </MemoryRouter>,
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

    const { container } = renderAdPage()

    expect(container.querySelector('.animate-pulse')).toBeTruthy()
    expect(screen.queryByText('Where should this ad appear?')).toBeNull()
  })

  it('lists checkbox destinations for paid platforms filtered by media type, plus pages', () => {
    mockAd([])
    renderAdPage()

    expect(screen.getByRole('checkbox', { name: 'Facebook' })).toBeTruthy()
    expect(screen.getByText('Feed — reach your audience')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Google' })).toBeTruthy()
    expect(screen.getByText('Across the web')).toBeTruthy()
    // The mocked asset is type IMAGE — YouTube (VIDEO-only) is filtered out of the paid list.
    expect(screen.queryByRole('checkbox', { name: 'YouTube' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Book a Detail' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Publish selected' })).toBeTruthy()
  })

  it('opens the platform settings review when a paid destination is selected and published', async () => {
    const user = userEvent.setup()
    mockAd([])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('checkbox', { name: 'Facebook' }))
    await user.click(screen.getByRole('button', { name: 'Publish selected' }))

    expect(screen.getByRole('heading', { name: 'Facebook Settings' })).toBeTruthy()
    expect(screen.getByText('Facebook connected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm Settings' })).toBeTruthy()
  })

  it('offers to connect the platform instead of a mysterious pseudo-send when disconnected', async () => {
    const user = userEvent.setup()
    mockAd([])
    mockConnection({ status: 'DISCONNECTED' })
    renderAdPage()

    await user.click(screen.getByRole('checkbox', { name: 'Facebook' }))
    await user.click(screen.getByRole('button', { name: 'Publish selected' }))

    expect(screen.getByText('Facebook is not connected')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirm Settings' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Connect Facebook' })).toBeTruthy()
  })

  it('publishing a selected page destination sends immediately with no review step (pages are free)', async () => {
    const user = userEvent.setup()
    mockAd([])
    const createRun = vi.fn().mockResolvedValue({ data: { id: 'run_lp', status: 'PENDING' } })
    const resumeRun = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useCreateAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.useCreateAdRun>>({ mutateAsync: createRun, isPending: false }),
    )
    vi.mocked(sdk.useResumeAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.useResumeAdRun>>({
        mutateAsync: resumeRun,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    renderAdPage()

    await user.click(screen.getByRole('checkbox', { name: 'Book a Detail' }))
    await user.click(screen.getByRole('button', { name: 'Publish selected' }))

    expect(createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        advertisementId: 'ad_123',
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: 'lp1',
      }),
    )
    expect(resumeRun).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_lp' }),
    )
    // No settings review modal for a free page destination.
    expect(screen.queryByRole('heading', { name: /Settings$/ })).toBeNull()
  })

  it('shows a sent run as a live draft with platform status and metrics', () => {
    mockAd([mockRun()])
    mockConnection()
    renderAdPage()

    expect(screen.getByText('Facebook')).toBeTruthy()
    expect(screen.getByText('Draft sent')).toBeTruthy()
    expect(screen.getByText('Facebook status: Active')).toBeTruthy()
    expect(screen.getByText('$12.50')).toBeTruthy() // Spend
  })

  it('shows the frozen authorization sentence and revision number for a sent run', () => {
    mockAd([
      mockRun({
        mediaOrderRevision: {
          revision: 3,
          goal: 'Get Leads',
          country: 'US',
          locationNote: null,
          dailyBudgetMinor: 2500,
          startAt: '2026-08-01T00:00:00.000Z',
          endAt: null,
          accountName: 'Acme Ads',
        },
      }),
    ])
    mockConnection()
    renderAdPage()

    expect(screen.getByText(/Spend \$25\.00\/day/)).toBeTruthy()
    expect(screen.getByText(/using this creative, billed to Facebook · Acme Ads\./)).toBeTruthy()
    expect(screen.getByText('Advertisement · media order revision 3')).toBeTruthy()
  })

  it('shows Pause and End for an active, remote-capable run, gated behind a confirm', async () => {
    const user = userEvent.setup()
    const onPause = vi.fn()
    vi.mocked(sdk.usePauseAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.usePauseAdRun>>({
        mutateAsync: onPause,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ status: 'ACTIVE' })])
    mockConnection()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'End' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(onPause).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1' }),
    )
  })

  it('does not pause when the confirm is declined', async () => {
    const user = userEvent.setup()
    const onPause = vi.fn()
    vi.mocked(sdk.usePauseAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.usePauseAdRun>>({
        mutateAsync: onPause,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ status: 'ACTIVE' })])
    mockConnection()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getByRole('button', { name: 'Pause' }))

    expect(onPause).not.toHaveBeenCalled()
  })

  it('resume requires confirming that it activates real spend, then calls the real mutation', async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()
    vi.mocked(sdk.useResumeAdRun).mockReturnValue(
      stub<ReturnType<typeof sdk.useResumeAdRun>>({
        mutateAsync: onResume,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ status: 'PAUSED' })])
    mockConnection()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getByRole('button', { name: 'Resume' }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('activates real ad spend'))
    expect(onResume).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1' }),
    )
  })

  it('offers no pause/resume/end/edit controls when the connector cannot remotely mutate this run', async () => {
    const user = userEvent.setup()
    // externalAdId: null means the run was never actually pushed, so the replace-creative/
    // destination section (gated on run.externalAdId) doesn't render either — the Manage sheet
    // that opens has nothing actionable in it. The Manage *trigger* itself still shows because
    // AdPage always wires onReplaceCreative/onReplaceDestination regardless of capabilities (see
    // AdEditor.tsx/AdPage.tsx) — those are only conditioned on run.externalAdId inside the modal.
    mockAd([mockRun({ status: 'ACTIVE', externalAdId: null })])
    mockConnection({
      capabilities: {
        ...FULL_CAPABILITIES,
        activate: false,
        pause: false,
        end: false,
        editModes: {
          budget: 'NONE',
          schedule: 'NONE',
          targeting: 'NONE',
          creative: 'NONE',
          destination: 'NONE',
        },
      },
    })
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'End' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Replace creative' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Change destination' })).toBeNull()
  })

  it('edits budget through a two-step confirm, then calls the real mutation', async () => {
    const user = userEvent.setup()
    const onEditBudget = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useUpdateAdRunBudget).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunBudget>>({
        mutateAsync: onEditBudget,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ budget: 25 })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    expect(screen.getByRole('heading', { name: 'Edit budget' })).toBeTruthy()

    const input = screen.getByDisplayValue('25')
    await user.clear(input)
    await user.type(input, '40')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('heading', { name: 'Change Facebook budget' })).toBeTruthy()
    expect(screen.getByText('$25.00/day → $40.00/day')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Change to $40.00/day' }))

    expect(onEditBudget).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1', dailyBudget: 40 }),
    )
  })

  it('keeps the budget modal open and shows the error when the mutation is rejected', async () => {
    const user = userEvent.setup()
    const onEditBudget = vi.fn().mockRejectedValue(new Error('Meta rejected the new budget'))
    vi.mocked(sdk.useUpdateAdRunBudget).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunBudget>>({
        mutateAsync: onEditBudget,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ budget: 25 })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    const input = screen.getByDisplayValue('25')
    await user.clear(input)
    await user.type(input, '40')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Change to $40.00/day' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Meta rejected the new budget')
    expect(screen.getByRole('heading', { name: 'Change Facebook budget' })).toBeTruthy()
  })

  it('offers no Edit budget control when the connector cannot edit budget remotely', async () => {
    const user = userEvent.setup()
    mockAd([mockRun({ budget: 25 })])
    mockConnection({
      capabilities: {
        ...FULL_CAPABILITIES,
        editModes: { ...FULL_CAPABILITIES.editModes, budget: 'NONE' },
      },
    })
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    // Two "Budget" text nodes exist (the metrics <dt> and the Manage panel's own <p> label) —
    // scope to the <p> one, the Manage sheet's section heading.
    const budgetSection = screen.getByText('Budget', { selector: 'p' }).closest('div')!
    expect(within(budgetSection).queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.getByText("Can't be changed from LOOPIE yet.")).toBeTruthy()
  })

  it('edits schedule through a two-step confirm, then calls the real mutation', async () => {
    const user = userEvent.setup()
    const onEditSchedule = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useUpdateAdRunSchedule).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunSchedule>>({
        mutateAsync: onEditSchedule,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ startDate: '2026-08-01T00:00:00.000Z', endDate: null })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]!)
    expect(screen.getByRole('heading', { name: 'Edit schedule' })).toBeTruthy()

    // No end date is checked by default (the run has none) — the End date input is disabled
    // until it's unchecked.
    await user.click(screen.getByRole('checkbox', { name: /No end date/ }))
    const endInput = screen.getByLabelText('End date')
    await user.type(endInput, '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Change Facebook schedule' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    expect(onEditSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1' }),
    )
    const call = onEditSchedule.mock.calls[0]![0]
    // toEndIso resolves the picked calendar day in the *local* timezone (see lib/adOrder.ts) —
    // compare local date parts, not a UTC ISO slice, which can land on the next/previous day
    // depending on the test runner's own timezone offset.
    const endedOn = new Date(call.endDate)
    expect([endedOn.getFullYear(), endedOn.getMonth(), endedOn.getDate()]).toEqual([2026, 8, 1])
  })

  it('keeps the schedule modal open and shows the error when the mutation is rejected', async () => {
    const user = userEvent.setup()
    const onEditSchedule = vi.fn().mockRejectedValue(new Error('Meta rejected the new schedule'))
    vi.mocked(sdk.useUpdateAdRunSchedule).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunSchedule>>({
        mutateAsync: onEditSchedule,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ startDate: '2026-08-01T00:00:00.000Z', endDate: null })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]!)
    await user.click(screen.getByRole('checkbox', { name: /No end date/ }))
    const endInput = screen.getByLabelText('End date')
    await user.type(endInput, '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Meta rejected the new schedule')
    expect(screen.getByRole('heading', { name: 'Change Facebook schedule' })).toBeTruthy()
  })

  it('supports clearing an end date to an explicit no-end schedule', async () => {
    const user = userEvent.setup()
    const onEditSchedule = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useUpdateAdRunSchedule).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunSchedule>>({
        mutateAsync: onEditSchedule,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([
      mockRun({ startDate: '2026-08-01T00:00:00.000Z', endDate: '2026-08-15T23:59:59.999Z' }),
    ])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]!)
    await user.click(screen.getByRole('checkbox', { name: /No end date/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))

    expect(onEditSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1', endDate: null }),
    )
  })

  it('offers no Edit schedule control when the connector cannot edit schedule remotely', async () => {
    const user = userEvent.setup()
    mockAd([mockRun({ startDate: '2026-08-01T00:00:00.000Z' })])
    mockConnection({
      capabilities: {
        ...FULL_CAPABILITIES,
        editModes: { ...FULL_CAPABILITIES.editModes, schedule: 'NONE' },
      },
    })
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    const scheduleSection = screen.getByText('Schedule').closest('div')!
    expect(within(scheduleSection).queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it('names the real edit consequence for in-place fields (budget, schedule) before the user opens an editor', async () => {
    const user = userEvent.setup()
    mockAd([mockRun({ startDate: '2026-08-01T00:00:00.000Z' })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    expect(screen.getAllByText('Updates the current Facebook run directly.')).toHaveLength(3) // budget, schedule, targeting
  })

  it('names the real edit consequence for the recreate path (relaunch) before the user relaunches', async () => {
    const user = userEvent.setup()
    mockAd([mockRun({ status: 'ACTIVE' })], '2026-08-10T00:00:00.000Z') // ad updated after the run's own lastSyncedAt
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    expect(
      screen.getByText('Advertisement changed since the Facebook version was sent.'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Creates a new Facebook version — the current run keeps delivering until you switch.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create new Facebook version' })).toBeTruthy()
  })

  it('drives edit-mode consequence text purely from capabilities, not a platform-name branch', async () => {
    const user = userEvent.setup()
    mockAd([
      mockRun({ platform: 'GOOGLE', placement: 'DISPLAY', startDate: '2026-08-01T00:00:00.000Z' }),
    ])
    mockConnection({
      capabilities: {
        ...FULL_CAPABILITIES,
        editModes: { ...FULL_CAPABILITIES.editModes, budget: 'RECREATE' },
      },
    })
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    expect(
      screen.getByText(
        'Creates a new Google version — the current run keeps delivering until you switch.',
      ),
    ).toBeTruthy()
  })

  it('edits targeting through a two-step confirm, then calls the real mutation', async () => {
    const user = userEvent.setup()
    const onEditTargeting = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useUpdateAdRunTargeting).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunTargeting>>({
        mutateAsync: onEditTargeting,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ country: 'US', locationNote: null, radiusMiles: null })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[2]!)
    expect(screen.getByRole('heading', { name: 'Edit targeting' })).toBeTruthy()

    await user.type(screen.getByPlaceholderText('Austin, TX'), 'Dallas, TX')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Change Facebook targeting' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Change targeting' }))
    expect(onEditTargeting).toHaveBeenCalledWith(
      expect.objectContaining({
        advertisementId: 'ad_123',
        runId: 'run_1',
        country: 'US',
        locationNote: 'Dallas, TX',
        radiusMiles: 10,
      }),
    )
  })

  it('keeps the targeting modal open and shows the error when the mutation is rejected', async () => {
    const user = userEvent.setup()
    const onEditTargeting = vi.fn().mockRejectedValue(new Error('Meta rejected the new targeting'))
    vi.mocked(sdk.useUpdateAdRunTargeting).mockReturnValue(
      stub<ReturnType<typeof sdk.useUpdateAdRunTargeting>>({
        mutateAsync: onEditTargeting,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ country: 'US', locationNote: null, radiusMiles: null })])
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[2]!)
    await user.type(screen.getByPlaceholderText('Austin, TX'), 'Dallas, TX')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Change targeting' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Meta rejected the new targeting')
    expect(screen.getByRole('heading', { name: 'Change Facebook targeting' })).toBeTruthy()
  })

  it('replaces creative through a confirm, calling the real mutation', async () => {
    const user = userEvent.setup()
    const onReplaceCreative = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useReplaceAdRunCreative).mockReturnValue(
      stub<ReturnType<typeof sdk.useReplaceAdRunCreative>>({
        mutateAsync: onReplaceCreative,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun()])
    mockConnection()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getByRole('button', { name: 'Replace creative' }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("can't be edited in place"))
    expect(onReplaceCreative).toHaveBeenCalledWith(
      expect.objectContaining({ advertisementId: 'ad_123', runId: 'run_1' }),
    )
  })

  it('replaces destination through a two-step picker, calling the real mutation with the new page', async () => {
    const user = userEvent.setup()
    const onReplaceDestination = vi.fn().mockResolvedValue({})
    vi.mocked(sdk.useReplaceAdRunDestination).mockReturnValue(
      stub<ReturnType<typeof sdk.useReplaceAdRunDestination>>({
        mutateAsync: onReplaceDestination,
        mutate: vi.fn(),
        isPending: false,
        variables: undefined,
      }),
    )
    mockAd([mockRun({ destinationLandingPageId: 'lp1' })])
    vi.mocked(sdk.useLandingPages).mockReturnValue(
      stub<ReturnType<typeof sdk.useLandingPages>>({
        data: {
          pages: [
            {
              data: [
                { id: 'lp1', name: 'Book a Detail', status: 'PUBLISHED' },
                { id: 'lp2', name: 'Spring Special', status: 'PUBLISHED' },
              ],
            },
          ],
        },
      }),
    )
    mockConnection()
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Manage' }))
    await user.click(screen.getByRole('button', { name: 'Change destination' }))
    expect(screen.getByRole('heading', { name: 'Change destination' })).toBeTruthy()

    await user.selectOptions(screen.getByRole('combobox'), 'lp2')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Replace Facebook destination' })).toBeTruthy()
    expect(screen.getByText('Book a Detail → Spring Special')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Replace destination' }))
    expect(onReplaceDestination).toHaveBeenCalledWith(
      expect.objectContaining({
        advertisementId: 'ad_123',
        runId: 'run_1',
        destinationLandingPageId: 'lp2',
      }),
    )
  })

  it('shows provider review issues when the platform reports them', () => {
    mockAd([mockRun({ providerIssues: ['Ad disapproved: Personal attributes'] })])
    mockConnection()
    renderAdPage()

    expect(screen.getByText('Facebook review')).toBeTruthy()
    expect(screen.getByText('Ad disapproved: Personal attributes')).toBeTruthy()
  })

  it('shows the real synced provider state and last-synced time once a sync has actually run', () => {
    mockAd([
      mockRun({
        syncHealth: 'CURRENT',
        providerState: 'LIVE',
        lastSyncedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      }),
    ])
    mockConnection()
    renderAdPage()

    expect(screen.getByText('Facebook status: Live')).toBeTruthy()
    expect(screen.getByText('Last synced 5m ago')).toBeTruthy()
  })

  it('shows budget drift between what LOOPIE requested and what the platform reports', () => {
    mockAd([mockRun({ budget: 25, effectiveBudget: 30 })])
    mockConnection()
    renderAdPage()

    expect(screen.getByText('Budget drifted')).toBeTruthy()
    expect(
      screen.getByText('LOOPIE requested $25.00/day · Facebook reports $30.00/day'),
    ).toBeTruthy()
  })

  it('surfaces a failed sync clearly, without discarding the last good data', () => {
    mockAd([mockRun({ syncHealth: 'FAILED', syncError: 'Meta API timeout' })])
    mockConnection()
    renderAdPage()

    expect(screen.getByText('Sync failed: Meta API timeout')).toBeTruthy()
    // Last-known metrics (from the mocked run) still render — nothing was cleared.
    expect(screen.getByText('$12.50')).toBeTruthy()
  })

  it('prompts a new version when the advertisement changed after the run was sent', () => {
    mockAd([mockRun({ lastSyncedAt: '2026-08-01T00:00:00.000Z' })], '2026-08-15T00:00:00.000Z')
    mockConnection()
    renderAdPage()

    // Visible without opening Manage isn't the contract here — the stale banner lives inside
    // Manage (see AdDestinationRow.tsx) since it's a consequence tied to the relaunch action.
    expect(screen.getByRole('button', { name: 'Manage' })).toBeTruthy()
  })

  it('posts to River from Publish selected and records prior publish times', async () => {
    const user = userEvent.setup()
    const publish = vi.fn().mockResolvedValue({ data: { id: 'version_2' } })
    const post = vi.fn().mockResolvedValue({ data: { id: 'river_2' } })
    vi.mocked(sdk.usePublishAdvertisement).mockReturnValue(
      stub<ReturnType<typeof sdk.usePublishAdvertisement>>({
        mutateAsync: publish,
        isPending: false,
      }),
    )
    vi.mocked(sdk.useCreateRiverPost).mockReturnValue(
      stub<ReturnType<typeof sdk.useCreateRiverPost>>({ mutateAsync: post, isPending: false }),
    )
    vi.mocked(sdk.useRiverPosts).mockReturnValue(
      stub<ReturnType<typeof sdk.useRiverPosts>>({
        data: {
          data: [
            {
              id: 'river_1',
              advertisementId: 'ad_123',
              createdAt: '2026-08-20T12:00:00.000Z',
              permalinkUrl: 'https://example.test/river/posts/river_1',
            },
          ],
        },
      }),
    )
    mockAd([])
    renderAdPage()

    const riverCheckbox = screen.getByRole('checkbox', { name: 'River' })
    expect(riverCheckbox).not.toBeChecked()
    const riverRow = riverCheckbox.closest('label')!
    expect(within(riverRow).getByText(/Published 1 time/)).toBeTruthy()
    await user.click(riverCheckbox)
    await user.click(screen.getByRole('button', { name: 'Publish selected' }))

    expect(publish).toHaveBeenCalledWith({ id: 'ad_123' })
    expect(post).toHaveBeenCalledWith({ type: 'AD', advertisementId: 'ad_123' })
    expect(screen.queryByRole('heading', { name: 'Post to River' })).toBeNull()
  })

  it('deletes the ad from the danger action after confirmation', async () => {
    const user = userEvent.setup()
    const remove = vi.fn().mockResolvedValue({ data: null })
    vi.mocked(sdk.useDeleteAdvertisement).mockReturnValue(
      stub<ReturnType<typeof sdk.useDeleteAdvertisement>>({
        mutateAsync: remove,
        isPending: false,
      }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockAd([])
    renderAdPage()

    await user.click(screen.getByRole('button', { name: 'Delete ad' }))
    expect(remove).toHaveBeenCalledWith('ad_123')
  })
})
