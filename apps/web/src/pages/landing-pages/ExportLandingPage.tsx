import { Navigate, useParams } from 'react-router-dom'

// Export is now a real download triggered from inside the editor (LandingPageMoreMenu -> Export
// HTML) instead of a separate page — this standalone route was never linked to from anywhere and
// was still the generator's raw JSON.stringify stub (a GET here doesn't even download a file,
// just dumps the export JSON payload to the screen).
export function ExportLandingPage() {
  const { landingPageId } = useParams<{ landingPageId: string }>()
  return <Navigate to={`/landing-pages/${landingPageId}`} replace />
}
