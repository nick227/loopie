import { useState, type DragEvent } from 'react'
import { Upload } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { fileToDataUrl, probeFile } from '@/lib/probeMedia'
import { MEDIA_FILE_ACCEPT, mediaFileError } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { AddMediaInput } from '@/components/media/AddMediaForm'

type AssetType = AddMediaInput['type']

function acceptFor(type?: AssetType) {
  if (type === 'IMAGE') return 'image/jpeg,image/png,image/webp,image/gif'
  if (type === 'VIDEO') return 'video/mp4,video/webm'
  if (type === 'AUDIO') return 'audio/mpeg,audio/wav'
  return MEDIA_FILE_ACCEPT
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Could not add media'
}

export function MediaUploadBar({
  adding,
  lockedType,
  onAdd,
}: {
  adding: boolean
  lockedType?: AssetType
  onAdd: (input: AddMediaInput) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)

  async function ingest(file: File) {
    setError(null)
    const invalid = mediaFileError(file)
    if (invalid) {
      setError(invalid)
      return
    }
    try {
      const probed = await probeFile(file)
      if (lockedType && probed.type !== lockedType) {
        setError(`Choose a ${lockedType.toLowerCase()} file`)
        return
      }
      const data = await fileToDataUrl(file)
      await onAdd({
        type: probed.type,
        name: file.name,
        mimeType: probed.mimeType,
        sizeBytes: probed.sizeBytes,
        widthPx: probed.widthPx,
        heightPx: probed.heightPx,
        durationMs: probed.durationMs,
        file: { filename: file.name, mimeType: probed.mimeType, data },
      })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setOver(false)
    const file = event.dataTransfer.files[0]
    if (file) void ingest(file)
  }

  return (
    <div className="shrink-0 space-y-2 px-3 pt-3 sm:px-5">
      <label
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm',
          over ? 'border-foreground bg-muted' : 'border-input-border bg-muted/40',
          adding && 'pointer-events-none opacity-60',
        )}
      >
        {adding ? <Spinner size="sm" /> : <Upload size={16} className="text-muted-foreground" />}
        <span className="text-muted-foreground">
          {adding ? (
            'Uploading…'
          ) : (
            <>
              <span className="md:hidden">Tap to upload</span>
              <span className="hidden md:inline">Drop a file or click to upload</span>
            </>
          )}
        </span>
        <input
          type="file"
          accept={acceptFor(lockedType)}
          disabled={adding}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void ingest(file)
          }}
          className="sr-only"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
