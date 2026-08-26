import { useState } from 'react'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

type Asset = components['schemas']['Asset']
type AssetType = Asset['type']

const TYPES: { value: AssetType; label: string }[] = [
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'TEXT', label: 'Text' },
  { value: 'AUDIO', label: 'Audio' },
]

export function MediaLibraryModal({
  assets,
  selectedIds,
  adding,
  onToggle,
  onAdd,
  onConfirm,
  onClose,
}: {
  assets: Asset[]
  selectedIds: string[]
  adding: boolean
  onToggle: (assetId: string) => void
  onAdd: (input: { type: AssetType; name: string; url: string }) => Promise<void>
  onConfirm: () => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<AssetType>('IMAGE')

  async function handleAdd() {
    await onAdd({ type, name, url })
    setName('')
    setUrl('')
  }

  return (
    <Modal
      title="Media"
      onClose={onClose}
      footer={
        <Button type="button" size="sm" onClick={onConfirm} disabled={selectedIds.length === 0}>
          Use selected
        </Button>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {assets.map((asset) => {
            const checked = selectedIds.includes(asset.id)
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onToggle(asset.id)}
                className={`text-left rounded-lg border p-2 ${
                  checked ? 'border-foreground' : 'border-border'
                }`}
              >
                {asset.url && asset.type === 'IMAGE' ? (
                  <img src={asset.url} alt="" className="h-16 w-full object-cover rounded mb-1" />
                ) : (
                  <div className="h-16 rounded bg-muted mb-1" />
                )}
                <p className="text-xs font-medium truncate">{asset.name}</p>
                <p className="text-[11px] text-muted-foreground">{asset.type}</p>
              </button>
            )
          })}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Add</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="flex h-10 w-full rounded-lg border border-input-border bg-transparent px-3 text-sm"
          >
            {TYPES.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!name || !url || adding}
          >
            Add media
          </Button>
        </div>
      </div>
    </Modal>
  )
}
