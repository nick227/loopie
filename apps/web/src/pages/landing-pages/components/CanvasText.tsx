import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

// The one inline-text editing primitive used everywhere content is edited directly in the live
// preview — section-schema templates (PageCanvas) and, via the same component, Corporate
// Professional's block-section components. Idle state renders exactly like the published page
// (no input chrome); double-click activates a real input/textarea in place. This is deliberately
// the *only* interaction model for inline text across the whole editor, not one of two.
export function CanvasText({
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
  multiline,
  rows = 2,
  style,
  as: Tag = 'div',
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  ariaLabel: string
  multiline?: boolean
  rows?: number
  style?: CSSProperties
  as?: 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'p'
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Keeps `draft` synced to `value` whenever either changes, as long as we're not actively
  // editing — including the moment `editing` itself flips back to false (guards against `value`
  // never actually catching up to a committed `draft`, e.g. a rejected onChange). React's
  // documented "adjust state while rendering" pattern (plain useState comparisons, not a ref —
  // see react-hooks/refs — and not inside an effect — see react-hooks/set-state-in-effect), a
  // faithful translation of the previous `useEffect(() => { if (!editing) setDraft(value) },
  // [value, editing])`.
  const [prevValue, setPrevValue] = useState(value)
  const [prevEditing, setPrevEditing] = useState(editing)
  if (value !== prevValue || editing !== prevEditing) {
    setPrevValue(value)
    setPrevEditing(editing)
    if (!editing) setDraft(value)
  }

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    } else if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault()
      commit()
    }
  }

  const shared = cn(
    'w-full bg-transparent border-0 outline-none rounded px-1 -mx-1 focus-visible:ring-2 focus-visible:ring-ring placeholder:text-[color:color-mix(in_srgb,var(--lp-ink)_42%,var(--lp-bg))]',
    className,
  )

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          aria-label={ariaLabel}
          value={draft}
          placeholder={placeholder}
          rows={rows}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={cn(shared, 'resize-none')}
          style={style}
        />
      )
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        aria-label={ariaLabel}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={shared}
        style={style}
      />
    )
  }

  const isEmpty = !value
  return (
    <Tag
      role="textbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          setEditing(true)
        }
      }}
      className={cn(
        shared,
        // min-h guarantees an empty field still has a non-zero, double-clickable box even with
        // no placeholder text — an empty field with nothing to click was a real dead end.
        'block min-h-[1em] cursor-text whitespace-pre-wrap outline-dashed outline-1 outline-transparent hover:outline-[color:color-mix(in_srgb,var(--lp-ink)_28%,var(--lp-bg))]',
        isEmpty && 'opacity-60',
      )}
      style={style}
    >
      {isEmpty ? (placeholder ?? ariaLabel) : value}
    </Tag>
  )
}
