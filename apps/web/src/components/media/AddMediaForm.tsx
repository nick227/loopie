import { useState, type DragEvent } from 'react'
import type { components } from '@project/sdk'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fileToDataUrl, probeFile, probeImageUrl } from '@/lib/probeMedia'
import { MEDIA_FILE_ACCEPT, mediaFileError } from '@/lib/media'
import { cn } from '@/lib/utils'

type Asset = components['schemas']['Asset']
type AssetType = Asset['type']
export type AddMediaInput = {
  type: AssetType
  name: string
  url?: string
  textContent?: string
  mimeType?: string
  sizeBytes?: number
  widthPx?: number
  heightPx?: number
  durationMs?: number
  file?: { filename: string; mimeType: string; data: string }
}

const TYPES: { value: AssetType; label: string }[] = [
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'TEXT', label: 'Text' },
]

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Could not add media'
}

export function AddMediaForm({
  adding,
  onAdd,
}: {
  adding: boolean
  onAdd: (input: AddMediaInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [textContent, setTextContent] = useState('')
  const [type, setType] = useState<AssetType>('IMAGE')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)

  function onFile(next: File | null) {
    setFile(next)
    setError(next ? mediaFileError(next) : null)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setOver(false)
    onFile(event.dataTransfer.files[0] ?? null)
  }

  async function handleAdd() {
    setError(null)
    try {
      if (file) {
        const invalid = mediaFileError(file)
        if (invalid) {
          setError(invalid)
          return
        }
        const probed = await probeFile(file)
        const data = await fileToDataUrl(file)
        await onAdd({
          type: probed.type,
          name: name || file.name,
          mimeType: probed.mimeType,
          sizeBytes: probed.sizeBytes,
          widthPx: probed.widthPx,
          heightPx: probed.heightPx,
          durationMs: probed.durationMs,
          file: { filename: file.name, mimeType: probed.mimeType, data },
        })
      } else if (type === 'TEXT') {
        await onAdd({ type, name, textContent })
      } else {
        const probed = type === 'IMAGE' && url ? await probeImageUrl(url) : null
        await onAdd({
          type,
          name,
          url,
          widthPx: probed?.widthPx,
          heightPx: probed?.heightPx,
        })
      }
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    setName('')
    setUrl('')
    setTextContent('')
    setFile(null)
  }

  const ready = file ? true : type === 'TEXT' ? Boolean(name && textContent) : Boolean(name && url)

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Add</p>
      {type !== 'TEXT' ? (
        <label
          onDragOver={(event) => {
            event.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-6 text-center',
            over ? 'border-foreground bg-muted' : 'border-input-border bg-muted/40',
          )}
        >
          <Upload size={16} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {file ? file.name : 'Drop a file or click to upload'}
          </span>
          <input
            type="file"
            accept={MEDIA_FILE_ACCEPT}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      ) : null}
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
      {type === 'TEXT' ? (
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Copy"
          rows={3}
          className="flex w-full rounded-lg border border-input-border bg-transparent px-3 py-2 text-sm"
        />
      ) : (
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleAdd}
        disabled={!ready || adding || Boolean(file && mediaFileError(file))}
      >
        Add media
      </Button>
    </div>
  )
}
