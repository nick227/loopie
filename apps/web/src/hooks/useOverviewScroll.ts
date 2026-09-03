import { useEffect } from 'react'
import { getInboxScrollY, setInboxScrollY } from '@/lib/inboxNavState'

// Preserve the business overview's position while the user visits a detail page. The overview
// moved from Home to the private profile, but this navigation behavior remains useful there.
export function useRestoreOverviewScroll() {
  useEffect(() => {
    const target = getInboxScrollY()
    if (target <= 0) return
    const timers = [0, 50, 150, 350, 700].map((delay) =>
      setTimeout(() => window.scrollTo(0, target), delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setInboxScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}
