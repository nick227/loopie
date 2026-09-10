import { useEffect, useState } from 'react'
import { calendarConfig } from '../calendar.config'

// Shared by the header Start/Stop Work control and the Team Activity strip (Phase 3): elapsed
// minutes lives in state, recomputed from Date.now() only inside the effect below — reading the
// clock during render itself fails React's purity rule. Recomputed on an interval and on
// focus/visibilitychange, since background tabs and locked phones throttle setInterval and would
// otherwise show a stale number once the tab comes back.
export function useElapsedMinutes(startedAt: string | null): number {
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  useEffect(() => {
    // No reset-to-0 branch needed: every caller only reads elapsedMinutes once it already knows
    // there's a current entry (an `if (!entry)` / `currentEntry ?` guard upstream), so a stale
    // value here while startedAt is null is never actually rendered.
    if (!startedAt) return
    const startedAtMs = new Date(startedAt).getTime()
    function recompute() {
      setElapsedMinutes(Math.max(0, Math.floor((Date.now() - startedAtMs) / 60_000)))
    }
    recompute()
    const interval = setInterval(recompute, calendarConfig.tracking.refreshIntervalMs)
    function onVisible() {
      if (document.visibilityState === 'visible') recompute()
    }
    window.addEventListener('focus', recompute)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', recompute)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [startedAt])

  return elapsedMinutes
}
