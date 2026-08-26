import { Input } from '@/components/ui/Input'

export function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const id = `lp-field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
