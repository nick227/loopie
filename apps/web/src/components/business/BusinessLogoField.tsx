import { useState } from 'react'
import { useAsset, useCreateAsset } from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { MediaPicker } from '@/components/media/MediaPicker'
import { mediaSrc } from '@/lib/media'

// Business only stores a plain logoUrl, not an assetId (see BusinessService — logo/avatar was the
// field the product-principles pass asked for, not a formal Asset relation). This wraps the
// existing MediaPicker/asset-upload flow (same one MediaSlotField uses for landing-page media) and
// immediately resolves the picked asset's own url, rather than persisting the assetId anywhere.
export function BusinessLogoField({
  name,
  logoUrl,
  onChange,
}: {
  name: string
  logoUrl: string | null
  onChange: (url: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [pickedAssetId, setPickedAssetId] = useState<string | undefined>(undefined)
  const assetQuery = useAsset(pickedAssetId ?? '')
  const createAsset = useCreateAsset()

  return (
    <div className="">
      <div className="space-y-1">
        <a onClick={() => setOpen(true)}>
          <Avatar src={mediaSrc(logoUrl)} name={name} size="lg" className="h-36 w-36 text-lg" />
        </a>
      </div>
      {open ? (
        <MediaPicker
          type="IMAGE"
          single
          selectedIds={pickedAssetId ? [pickedAssetId] : []}
          adding={createAsset.isPending}
          onToggle={(id) => setPickedAssetId(id)}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPickedAssetId(id)
          }}
          onConfirm={() => {
            // Store the asset's own (relative) url, same as everywhere else Asset.url is
            // persisted — mediaSrc() resolves it against the current environment's API origin at
            // display time only, never baked into stored data.
            const url = assetQuery.data?.data?.url
            if (url) onChange(url)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
