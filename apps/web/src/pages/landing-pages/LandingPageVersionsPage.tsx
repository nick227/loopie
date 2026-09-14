import { Navigate, useParams } from 'react-router-dom'

// Version history is now reachable from inside the real editor (LandingPageMoreMenu ->
// LandingPageVersionsModal) instead of a separate page — this standalone route was never linked
// to from anywhere and was still the generator's raw JSON.stringify stub.
export function LandingPageVersionsPage() {
  const { landingPageId } = useParams<{ landingPageId: string }>()
  return <Navigate to={`/landing-pages/${landingPageId}`} replace />
}
