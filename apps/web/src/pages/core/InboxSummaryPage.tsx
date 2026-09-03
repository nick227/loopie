import { WelcomeSection } from '@/components/welcome/WelcomeSection'
import { useRestoreOverviewScroll } from '@/hooks/useOverviewScroll'

// Home is now literally the shared welcome section (docs/strategy/03-product-principles.md's
// 2026-08-30 nav revision) — the same component embedded atop Pages/Advertising/Contacts/
// Messages too. Superseded the former bespoke Home layout (BusinessIdentityCard/InboxFeed/
// OwnedSystemCard "Running" grid/AddToLoopie connect-prompts, all now deleted as dead code — see
// WelcomeSection.tsx and its children for the replacement).
export function InboxSummaryPage() {
  useRestoreOverviewScroll()
  return <WelcomeSection />
}
