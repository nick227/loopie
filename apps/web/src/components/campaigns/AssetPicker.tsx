import type { components } from '@project/sdk'
import { Input } from '@/components/ui/Input'

type Asset = components['schemas']['Asset']

export function AssetPicker({
  assets,
  selectedIds,
  onToggle,
}: {
  assets: Asset[]
  selectedIds: string[]
  onToggle: (assetId: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Assets</p>
      {assets.map((asset) => {
        const checked = selectedIds.includes(asset.id)
        return (
          <label key={asset.id} htmlFor={`asset-${asset.id}`} className="flex items-center gap-2 text-sm">
            <Input
              id={`asset-${asset.id}`}
              type="checkbox"
              className="h-4 w-4"
              checked={checked}
              onChange={() => onToggle(asset.id)}
            />
            {asset.name}
            <span className="text-xs text-muted-foreground">{asset.type}</span>
          </label>
        )
      })}
    </div>
  )
}
