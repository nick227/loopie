import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export function CanvasText({
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
  multiline,
  style,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  ariaLabel: string
  multiline?: boolean
  style?: CSSProperties
}) {
  const shared = cn(
    'w-full bg-transparent border-0 outline-none rounded px-1 -mx-1 focus-visible:ring-2 focus-visible:ring-ring',
    className,
  )
  if (multiline) {
    return (
      <textarea
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className={cn(shared, 'resize-none')}
        style={style}
      />
    )
  }
  return (
    <input
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={shared}
      style={style}
    />
  )
}
