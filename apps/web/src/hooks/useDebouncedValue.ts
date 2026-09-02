import { useEffect, useState } from 'react'

// Debounces a fast-changing value (e.g. a search input) before it's used as a query key.
// Without this, every keystroke fires a new request; if an earlier request resolves after a
// later one, the result list can flicker/reorder mid-interaction — surfaced as real click
// instability in the tag-picker dropdowns (see CLAUDE.md's contact profile UI entry).
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
