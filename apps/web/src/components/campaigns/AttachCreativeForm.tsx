import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'

type Option = { id: string; name: string }

export function AttachCreativeForm({
  creatives,
  pending,
  onAttach,
}: {
  creatives: Option[]
  pending: boolean
  onAttach: (creativeId: string) => Promise<void>
}) {
  const [creativeId, setCreativeId] = useState(creatives[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  if (creatives.length === 0) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await onAttach(creativeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach creative')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5 flex-1">
        <label htmlFor="attach-creative" className="text-sm font-medium">
          Attach from library
        </label>
        <select
          id="attach-creative"
          value={creativeId}
          onChange={(e) => setCreativeId(e.target.value)}
          className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {creatives.map((creative) => (
            <option key={creative.id} value={creative.id}>
              {creative.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Attach to campaign
      </Button>
    </form>
  )
}
