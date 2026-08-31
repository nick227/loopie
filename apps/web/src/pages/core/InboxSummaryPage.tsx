import { useEffect } from 'react'
import { WelcomeSection } from '@/components/welcome/WelcomeSection'
import { getInboxScrollY, setInboxScrollY } from '@/lib/inboxNavState'

// State continuity for the one loop this still needs to cover (docs/strategy/03-product-
// principles.md): Home -> an Inbox thread opened from Recent Response -> Back restores scroll
// position. Best-effort, not pixel-perfect — WelcomeSection's content height depends on several
// independently-loading pieces, so this retries a few times after mount to catch layout settling
// late, rather than wiring a cross-component "fully loaded" signal that isn't worth the coupling.
function useRestoreHomeScroll() {
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

// Home is now literally the shared welcome section (docs/strategy/03-product-principles.md's
// 2026-08-30 nav revision) — the same component embedded atop Pages/Advertising/Contacts/
// Messages too. Superseded the former bespoke Home layout (BusinessIdentityCard/InboxFeed/
// OwnedSystemCard "Running" grid/AddToLoopie connect-prompts, all now deleted as dead code — see
// WelcomeSection.tsx and its children for the replacement).
export function InboxSummaryPage() {
  useRestoreHomeScroll()
  return <WelcomeSection />
}
