import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAsset, useDeleteAsset } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatBytes, formatDuration, mediaSrc, PLACEMENT_LABEL } from '@/lib/media'

export function MediaItemPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useAsset(assetId!)
  const remove = useDeleteAsset()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const item = data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  const src = mediaSrc(item.url)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <Link to="/media" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Media
            </Link>
          </p>
          <h1 className="text-xl font-semibold mt-1">{item.name}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await remove.mutateAsync(item.id)
            navigate('/media')
          }}
        >
          Delete
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {item.type === 'IMAGE' && src ? (
          <img src={src} alt="" className="w-full max-h-[28rem] object-contain" />
        ) : item.type === 'VIDEO' && src ? (
          <video src={src} controls className="w-full max-h-[28rem]" />
        ) : item.type === 'TEXT' ? (
          <p className="p-6 text-sm leading-relaxed font-serif">{item.textContent}</p>
        ) : (
          <p className="p-10 text-center text-sm text-zinc-500">{item.type}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Size</dt>
          <dd className="tabular-nums mt-1">
            {item.widthPx && item.heightPx ? `${item.widthPx}×${item.heightPx}` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Ratio</dt>
          <dd className="tabular-nums mt-1">{item.aspectRatio ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Duration</dt>
          <dd className="tabular-nums mt-1">{formatDuration(item.durationMs) ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">File</dt>
          <dd className="tabular-nums mt-1">
            {formatBytes(item.sizeBytes) ?? item.mimeType ?? '—'}
          </dd>
        </div>
      </dl>

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Placements</h2>
        {item.placements.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.placements.map((id) => (
              <span
                key={id}
                className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {PLACEMENT_LABEL[id] ?? id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No matching feed, story, or landscape spec.</p>
        )}
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Used in</h2>
        <p>
          {item.usedInAds} {item.usedInAds === 1 ? 'ad' : 'ads'}
          {item.usedInTemplates > 0
            ? ` · ${item.usedInTemplates} ${item.usedInTemplates === 1 ? 'template' : 'templates'}`
            : ''}
        </p>
      </section>
    </div>
  )
}
