import { useState, type FormEvent } from 'react'
import { useAsset, useLandingPages } from '@project/sdk'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { AddMediaInput } from '@/components/media/AddMediaForm'
import { AdMediaEmpty, AdMediaStage } from '@/components/ads/AdMediaStage'
import {
  AdDestinations,
  selectedToPublishTargets,
  type PublishTarget,
} from '@/components/ads/AdDestinations'
import { useFlatPages } from '@/hooks/useFlatPages'
import { runDestinationKey, type PreviewFrameId } from '@/lib/adPreview'

type AdRun = components['schemas']['AdRun']

export function AdEditor({
  heading,
  name,
  assetIds,
  runs,
  pending,
  error,
  onName,
  onAssetIds,
  onAddAsset,
  onSave,
  onStartNew,
  onStartRun,
  onPauseRun,
  onStartAll,
  onPauseAll,
}: {
  heading: string
  name: string
  assetIds: string[]
  runs: AdRun[]
  pending: boolean
  error: string | null
  onName: (value: string) => void
  onAssetIds: (ids: string[]) => void
  onAddAsset: (input: AddMediaInput) => Promise<void>
  onSave: () => Promise<void>
  onStartNew: (targets: PublishTarget[]) => Promise<void>
  onStartRun?: (runId: string) => void
  onPauseRun?: (runId: string) => void
  onStartAll?: () => void
  onPauseAll?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [frameId, setFrameId] = useState<PreviewFrameId>('desktop')
  const [selected, setSelected] = useState<string[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const pages = useFlatPages(useLandingPages({ limit: 100 }))
  const onDeckId = assetIds[0]
  const onDeck = useAsset(onDeckId ?? '').data?.data
  const liveKeys = new Set(runs.map(runDestinationKey))
  const pendingKeys = selected.filter((key) => !liveKeys.has(key))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-8">
      <h1 className="text-center text-xl font-semibold">{heading}</h1>
      <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Ad name" required />

      <div className="space-y-2">
        <p className="text-center text-sm font-medium">Media</p>
        {onDeckId && onDeck ? (
          <AdMediaStage
            asset={onDeck}
            frameId={frameId}
            onFrame={setFrameId}
            onRemove={() => onAssetIds([])}
          />
        ) : onDeckId ? (
          <Skeleton className="min-h-56 w-full rounded-xl" />
        ) : (
          <AdMediaEmpty onChoose={() => setOpen(true)} />
        )}
      </div>

      {onDeckId || runs.length > 0 ? (
        <AdDestinations
          mediaType={onDeck && onDeck.type !== 'AUDIO' ? onDeck.type : undefined}
          pages={pages}
          runs={runs}
          selected={selected}
          budgets={budgets}
          onToggle={(key) =>
            setSelected((current) =>
              current.includes(key) ? current.filter((row) => row !== key) : [...current, key],
            )
          }
          onBudget={(key, value) => setBudgets((current) => ({ ...current, [key]: value }))}
          onStart={onStartRun}
          onPause={onPauseRun}
          onStartAll={onStartAll}
          onPauseAll={onPauseAll}
        />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="submit" disabled={pending || !name || assetIds.length === 0}>
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !name || assetIds.length === 0 || pendingKeys.length === 0}
          onClick={() => onStartNew(selectedToPublishTargets(pendingKeys, budgets))}
        >
          Start
        </Button>
      </div>

      {open ? (
        <MediaPicker
          selectedIds={assetIds}
          adding={pending}
          single
          onToggle={(id) => onAssetIds(assetIds[0] === id ? [] : [id])}
          onAdd={onAddAsset}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </form>
  )
}
