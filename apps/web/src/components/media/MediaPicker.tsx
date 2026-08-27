import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AddMediaForm, type AddMediaInput } from '@/components/media/AddMediaForm'
import { MediaGrid } from '@/components/media/MediaGrid'

type Asset = components['schemas']['Asset']

export function MediaPicker({
  assets,
  selectedIds,
  adding,
  onToggle,
  onAdd,
  onConfirm,
  onClose,
  single,
}: {
  assets: Asset[]
  selectedIds: string[]
  adding: boolean
  onToggle: (assetId: string) => void
  onAdd: (input: AddMediaInput) => Promise<void>
  onConfirm: () => void
  onClose: () => void
  single?: boolean
}) {
  return (
    <Modal
      title="Media"
      size="xl"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between w-full">
          <Link to="/media" className="text-sm underline underline-offset-4">
            Manage library
          </Link>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={single ? selectedIds.length !== 1 : selectedIds.length === 0}
          >
            Use selected
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <MediaGrid assets={assets} selectedIds={selectedIds} onToggle={onToggle} />
        <div className="border-t border-border pt-3">
          <AddMediaForm adding={adding} onAdd={onAdd} />
        </div>
      </div>
    </Modal>
  )
}
