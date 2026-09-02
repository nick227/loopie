import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAssets, useCreateAsset } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { MediaPicker } from '@/components/media/MediaPicker'
import { useFlatPages } from '@/hooks/useFlatPages'
import { mediaSrc } from '@/lib/media'

// Mirrors BusinessLogoField.tsx's shape (MediaPicker + useCreateAsset for upload-and-pick), but
// multi-select and ordered — the public profile's Gallery section (slice 5). Stores resolved URLs
// directly on Business.galleryImageUrls, same "no asset-id join table" convention as logoUrl.
// Deliberately append-order only, no drag-to-reorder — a real drag-and-drop subsystem wasn't
// earning its cost for a v1 gallery (see the slice-5 plan doc).
export function BusinessGalleryField({
  imageUrls,
  onChange,
}: {
  imageUrls: string[]
  onChange: (urls: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const createAsset = useCreateAsset()
  // A large-enough single page, not full pagination — gallery curation picks from recent/existing
  // images, not the entire asset library at once (same "gallery-sized asset counts" scope call as
  // the plan doc; MediaPicker's own internal picking UI still lets you search for anything).
  const assets = useFlatPages(useAssets({ type: 'IMAGE', limit: 100 }))

  function removeAt(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index))
  }

  function confirmPicked() {
    const newUrls = pickedIds
      .map((id) => assets.find((a) => a.id === id)?.url)
      .filter((url): url is string => Boolean(url))
    onChange([...imageUrls, ...newUrls])
    setPickedIds([])
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Gallery (shown on your public profile)</p>
      {imageUrls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imageUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border"
            >
              <img src={mediaSrc(url) ?? undefined} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-1.5" />
        Add photos
      </Button>
      {open ? (
        <MediaPicker
          type="IMAGE"
          selectedIds={pickedIds}
          adding={createAsset.isPending}
          onToggle={(id) =>
            setPickedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
          }
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPickedIds((ids) => [...ids, id])
          }}
          onConfirm={confirmPicked}
          onClose={() => {
            setPickedIds([])
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
