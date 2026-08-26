import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { FeatureItem } from './types'

export function FeatureGridEditor({
  items,
  onChange,
}: {
  items: FeatureItem[]
  onChange: (items: FeatureItem[]) => void
}) {
  function update(i: number, patch: Partial<FeatureItem>) {
    const next = items.slice()
    const current = next[i] ?? { title: '', body: '' }
    next[i] = { ...current, ...patch }
    onChange(next)
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="rounded border border-input-border p-2 flex flex-col gap-2">
          <Input
            value={item.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Feature title"
          />
          <Textarea
            value={item.body}
            onChange={(e) => update(i, { body: e.target.value })}
            rows={2}
            placeholder="Feature description"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => remove(i)}
            className="self-start text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { title: '', body: '' }])}
        className="self-start"
      >
        Add feature
      </Button>
    </div>
  )
}
