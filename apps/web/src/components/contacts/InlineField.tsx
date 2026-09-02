import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// The one inline-edit primitive both create and view mode share — a bare input styled to read as
// plain text until you touch it, same ghost-input language PageHeader's editableTitle already
// established for Campaign's rename-in-place header. Uncontrolled (defaultValue + onBlur commit),
// not controlled per-keystroke — an API-backed field shouldn't fire a request on every character,
// and a local-draft field doesn't need the extra re-renders either.
export function InlineField({
  value,
  placeholder,
  onCommit,
  className,
  type = 'text',
  ariaLabel,
  disabled,
}: {
  value: string
  placeholder: string
  onCommit: (value: string) => void
  className?: string
  type?: InputHTMLAttributes<HTMLInputElement>['type']
  ariaLabel: string
  disabled?: boolean
}) {
  // Remounts the input when the committed value changes externally (e.g. another tab updated it,
  // or a save round-trip normalized it) — defaultValue alone wouldn't pick that up.
  const [key, setKey] = useState(0)

  return (
    <input
      key={key}
      type={type}
      defaultValue={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onBlur={(event) => {
        const next = event.target.value.trim()
        if (next !== value) onCommit(next)
        setKey((k) => k + 1)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          event.currentTarget.value = value
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 -mx-1.5 outline-none transition-colors',
        'hover:border-border hover:bg-muted/40',
        'focus-visible:border-input-border focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
    />
  )
}
