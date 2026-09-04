import { cn } from '@/lib/utils'

// The "limited Canva" picker primitive — every design control in AdDesigner (text placement,
// font scale, overlay, CTA placement, media focal point) is one of these rows. Visual selection
// (a highlighted chip), not a dropdown of enum values — see CLAUDE.md's Ad Designer "Make preset
// selection visual and playful" direction.
export function PresetChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              value === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input-border bg-transparent text-foreground hover:bg-accent',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
