import { Navigate, useParams } from 'react-router-dom'

// LandingPage.tsx's own editor already renders this data inline (PageActivity, fed by the same
// useLandingPagePerformance hook) — this standalone route is dead (no inbound link anywhere) and
// was still the generator's raw JSON.stringify stub. Redirect to the real page, matching the
// same fix already applied to its sibling, CampaignPerformancePage.tsx.
export function LandingPagePerformancePage() {
  const { landingPageId } = useParams<{ landingPageId: string }>()
  return <Navigate to={`/landing-pages/${landingPageId}`} replace />
}
