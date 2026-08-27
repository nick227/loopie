import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { LayoutTemplate } from 'lucide-react'

type LandingPage = components['schemas']['LandingPage']

const STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Live',
  ARCHIVED: 'Archived',
}

function thumbUrl(content: LandingPage['content']): string | null {
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
  const editor = `/landing-pages/${page.id}`

  return (
    <Card className="overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <CardContent className="flex flex-col items-stretch p-0 sm:flex-row">
        <div className="flex min-h-[120px] w-full shrink-0 items-center justify-center overflow-hidden border-r border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:w-48">
          {src && !broken ? (
            <img
              src={src}
              alt=""
              className="h-full min-h-[120px] w-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <LayoutTemplate size={24} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">No image</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link to={editor} className="hover:underline">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {page.name}
                </h3>
              </Link>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {STATUS[page.status] ?? page.status}
                </span>
                {page.status === 'PUBLISHED' ? (
                  <span className="truncate text-xs text-zinc-500">/p/{page.slug}</span>
                ) : null}
              </div>
            </div>
            <Link
              to={editor}
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-zinc-500 hover:bg-accent hover:text-zinc-900"
            >
              Edit
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            {page.formStartCount.toLocaleString()} form starts
            {page.adSlotCount
              ? ` · ${page.adSlotCount} ad space${page.adSlotCount === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
