import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'

// The one shared piece between the Studio gallery widget (visual editor) and the Content tab's
// gallery field: opening the real asset library in multi-select mode and turning a confirmed
// selection into new gallery rows. Each caller owns its own items array and its own visual
// treatment — this component only owns the "add photos" interaction.
export function GalleryAddButton({
  onAdd,
  label = 'Add photos',
  className,
}: {
  onAdd: (assetIds: string[]) => void
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const createAsset = useCreateAsset()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPicked([])
          setOpen(true)
        }}
        className={className}
      >
        <Plus className="h-4 w-4" /> {label}
      </button>
      {open ? (
        <MediaPicker
          type="IMAGE"
          selectedIds={picked}
          adding={createAsset.isPending}
          onToggle={(id) =>
            setPicked((current) =>
              current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
            )
          }
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPicked((current) => [...current, id])
          }}
          onConfirm={() => {
            if (picked.length) onAdd(picked)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
