import { Link } from 'react-router-dom'
import { useLandingPages } from '@project/sdk'
import { ExternalLink } from 'lucide-react'

export const SELECT_CLASS =
  'flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function DestinationPicker({
  value,
  onChange,
  required = false,
}: {
  value: string
  onChange: (landingPageId: string) => void
  required?: boolean
}) {
  const pagesQuery = useLandingPages({ limit: 100 })
  const pages = (pagesQuery.data?.pages.flatMap((page) => page.data) ?? []).filter(
    (page) => page.status === 'PUBLISHED',
  )
  const selected = pages.find((page) => page.id === value)

  return (
    <div className="space-y-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Destination landing page
        <select className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">Select a published page</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          {selected.name} —{' '}
          {selected.hostedUrl && (
            <a href={selected.hostedUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
              {selected.hostedUrl} <ExternalLink size={10} />
            </a>
          )}
          {' · '}
          <Link to={`/landing-pages/${selected.id}`} className="underline">
            edit it
          </Link>
        </p>
      )}
      <p className="text-xs text-muted-foreground">New clicks go here. Past referrals stay attributed.</p>
    </div>
  )
}
