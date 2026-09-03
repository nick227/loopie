import { useState } from 'react'
import { Image, RotateCcw } from 'lucide-react'
import { useAsset, useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'
import { Button } from '@/components/ui/Button'
import { mediaSrc } from '@/lib/media'
import { DEFAULT_PAGE_FAVICON_URL, type MediaRef } from './types'

export function BrowserFaviconField({
  favicon,
  onChange,
}: {
  favicon?: MediaRef
  onChange: (favicon: MediaRef) => void
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | undefined>(favicon?.assetId)
  const assetQuery = useAsset(favicon?.assetId ?? '')
  const createAsset = useCreateAsset()
  const selectedUrl = assetQuery.data?.data?.url
  const src = favicon?.assetId
    ? mediaSrc(selectedUrl)
    : (favicon?.src ?? favicon?.url ?? DEFAULT_PAGE_FAVICON_URL)
  const isLoopieDefault =
    !favicon?.assetId &&
    !favicon?.src &&
    (!favicon?.url || favicon.url === DEFAULT_PAGE_FAVICON_URL)

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">Favicon</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-input-border bg-background">
          {src ? <img src={src} alt="Current favicon" className="h-7 w-7 object-contain" /> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPicked(favicon?.assetId)
            setOpen(true)
          }}
        >
          <Image size={14} /> Choose from media
        </Button>
        {!isLoopieDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ url: DEFAULT_PAGE_FAVICON_URL })}
          >
            <RotateCcw size={14} /> Use LOOPIE favicon
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">LOOPIE default</span>
        )}
      </div>

      {open ? (
        <MediaPicker
          type="IMAGE"
          single
          selectedIds={picked ? [picked] : []}
          adding={createAsset.isPending}
          onToggle={(id) => setPicked(id)}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPicked(id)
          }}
          onConfirm={() => {
            if (picked) onChange({ assetId: picked })
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
