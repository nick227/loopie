import { useState } from 'react'
import type { components } from '@project/sdk'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { relativeTime } from '@/components/home/homeFormat'
import { LayoutTemplate } from 'lucide-react'

type LandingPage = components['schemas']['LandingPage']

const STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Live',
  ARCHIVED: 'Archived',
}

// Same tint-pair status-pill convention as AdRow — a live page is a success state, everything
// else stays neutral rather than claiming a status that hasn't happened.
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PUBLISHED: 'bg-success/10 text-success',
  ARCHIVED: 'bg-muted text-muted-foreground',
}

// The row's one headline number (docs/strategy/03-product-principles.md's Collection grammar):
// the real outcome (submissionCount — completed submissions, not formStartCount's funnel-top
// count of abandoned attempts too, same distinction the Inbox Running card already draws).
// Everything else that used to be crammed into this one string now gets its own meta pill below,
// so a glance at the row surfaces more, not less.
function rowSubtitle(page: LandingPage): string {
  return `${page.submissionCount.toLocaleString()} submission${page.submissionCount === 1 ? '' : 's'}`
}

export function thumbUrl(content: LandingPage['content']): string | null {
  const sections = content.sections
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return null
  for (const key of ['image', 'split'] as const) {
    const section = (sections as Record<string, unknown>)[key]
    if (!section || typeof section !== 'object') continue
    const imageUrl = (section as { imageUrl?: unknown }).imageUrl
    if (typeof imageUrl === 'string' && imageUrl) return imageUrl
  }
  return null
}

export function PageRow({ page }: { page: LandingPage }) {
  const [broken, setBroken] = useState(false)
  const src = thumbUrl(page.content)

  return (
    <UniversalRow
      density="featured"
      href={`/landing-pages/${page.id}`}
      state={{ from: 'Pages', fromTo: '/landing-pages' }}
      leading={
        src && !broken ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <LayoutTemplate size={22} />
          </div>
        )
      }
      title={page.name}
      subtitle={rowSubtitle(page)}
      meta={
        <>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_STYLE[page.status] ?? 'bg-muted text-muted-foreground'}`}
          >
            {STATUS[page.status] ?? page.status}
          </span>
          {page.status === 'PUBLISHED' ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              /p/{page.slug}
            </span>
          ) : null}
          {page.formStartCount > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {Math.round((page.submissionCount / page.formStartCount) * 100)}% conversion
            </span>
          ) : null}
          {page.adSlotCount ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {page.adSlotCount} ad space{page.adSlotCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </>
      }
      trailing={`Created ${relativeTime(page.createdAt)}`}
    />
  )
}
