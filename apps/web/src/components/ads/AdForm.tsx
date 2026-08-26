import { useState, type FormEvent } from 'react'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MediaLibraryModal } from '@/components/ads/MediaLibraryModal'

type Asset = components['schemas']['Asset']
type AssetType = Asset['type']

export function AdForm({
  name,
  assetIds,
  assets,
  pending,
  error,
  submitLabel,
  onName,
  onToggleAsset,
  onAddAsset,
  onSubmit,
}: {
  name: string
  assetIds: string[]
  assets: Asset[]
  pending: boolean
  error: string | null
  submitLabel: string
  onName: (value: string) => void
  onToggleAsset: (assetId: string) => void
  onAddAsset: (input: { type: AssetType; name: string; url: string }) => Promise<void>
  onSubmit: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const selected = assets.filter((asset) => assetIds.includes(asset.id))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Ad name" required />

      <div className="space-y-2">
        <p className="text-sm font-medium">Media</p>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media selected.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {selected.map((asset) => (
              <li key={asset.id}>{asset.name}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm underline underline-offset-4"
        >
          Choose media
        </button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" size="sm" disabled={pending || !name || assetIds.length === 0}>
        {submitLabel}
      </Button>

      {open ? (
        <MediaLibraryModal
          assets={assets}
          selectedIds={assetIds}
          adding={pending}
          onToggle={onToggleAsset}
          onAdd={onAddAsset}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </form>
  )
}
