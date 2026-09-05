import type { components } from '@project/sdk'
import { UniversalRow, type UniversalRowAccent } from '@/components/ui/UniversalRow'
import { RowSelectCheckbox } from '@/components/ui/RowSelectCheckbox'
import { relativeTime } from '@/components/home/homeFormat'
import { mediaSrc } from '@/lib/media'
import { PagePreviewThumb } from './PagePreviewThumb'

type LandingPage = components['schemas']['LandingPage']

const STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Live',
  ARCHIVED: 'Archived',
}

const STATUS_TONE: Record<string, UniversalRowAccent> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
}

export function thumbUrl(content: LandingPage['content']): string | null {
  if (!content || typeof content !== 'object') return null
  const c = content as Record<string, unknown>
  for (const group of ['hero', 'media'] as const) {
    const slot = c[group]
    if (!slot || typeof slot !== 'object') continue
    const media = (slot as { media?: { url?: unknown }; url?: unknown }).media ?? slot
    const url = (media as { url?: unknown }).url
    if (typeof url === 'string' && url) return url
  }
  return null
}

// The one-line performance takeaway a business actually wants at a glance — real data only,
// never a manufactured metric. `isBestPerformer` is decided by the caller across the whole
// collection (same computation PagesCollectionInsights already does), so at most one row ever
// claims it, and only when there's a real leader (submissionCount > 0) to claim.
function pageInsight(page: LandingPage, isBestPerformer: boolean): string {
  if (page.submissionCount > 0 && isBestPerformer) return 'Best-performing page'
  if (page.submissionCount > 0) {
    return `${page.submissionCount.toLocaleString()} lead${page.submissionCount === 1 ? '' : 's'} from this page`
  }
  if (page.status !== 'PUBLISHED') return 'Not published yet'
  return 'No leads yet'
}

function PageListThumb({ page }: { page: LandingPage }) {
  const src =
    page.thumbnailStatus === 'READY' && page.thumbnailUrl ? mediaSrc(page.thumbnailUrl) : null
  if (src) {
    return <img src={src} alt="" className="h-full w-full object-cover object-top" />
  }
  return <PagePreviewThumb page={page} />
}

export function PageRow({
  page,
  selected = false,
  onToggleSelect,
  isBestPerformer = false,
}: {
  page: LandingPage
  selected?: boolean
  onToggleSelect?: () => void
  isBestPerformer?: boolean
}) {
  const conversion =
    page.formStartCount > 0 ? Math.round((page.submissionCount / page.formStartCount) * 100) : null

  return (
    <UniversalRow
      density="showcase"
      href={`/landing-pages/${page.id}`}
      state={{ from: 'Pages', fromTo: '/landing-pages' }}
      selected={selected}
      leading={<PageListThumb page={page} />}
      title={page.name}
      subtitle={pageInsight(page, isBestPerformer)}
      trailing={`Created ${relativeTime(page.createdAt)}`}
      status={{
        label: STATUS[page.status] ?? page.status,
        tone: STATUS_TONE[page.status] ?? 'neutral',
      }}
      viewLink={
        page.status === 'PUBLISHED' && page.hostedUrl
          ? { label: 'View live', url: page.hostedUrl }
          : undefined
      }
      stats={[
        { value: page.submissionCount.toLocaleString(), label: 'leads' },
        { value: conversion === null ? '—' : `${conversion}%`, label: 'conversion' },
        {
          value: String(page.adSlotCount ?? 0),
          label: `ad space${page.adSlotCount === 1 ? '' : 's'}`,
        },
      ]}
      action={
        onToggleSelect ? (
          <RowSelectCheckbox
            checked={selected}
            label={`Select ${page.name}`}
            onToggle={onToggleSelect}
          />
        ) : null
      }
    />
  )
}
