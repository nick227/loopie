// This server's own externally-reachable base URL — used for tracked-redirect targets
// (Deployment.trackedUrl), hosted landing pages (/p/{slug}), and the submit-action URL
// embedded in rendered landing-page HTML. One env var for all three since, in V1, all three
// are served by this same process (ad-server, a separate process, computes its own URLs).
export const PUBLIC_SERVER_URL =
  process.env.TRACKING_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`

export function trackedDeploymentUrl(deploymentId: string) {
  return `${PUBLIC_SERVER_URL}/r/${deploymentId}`
}

export function hostedPageUrl(slug: string) {
  return `${PUBLIC_SERVER_URL}/p/${slug}`
}

export function landingPageSubmitUrl(landingPageId: string) {
  return `${PUBLIC_SERVER_URL}/landing-pages/${landingPageId}/submissions`
}
