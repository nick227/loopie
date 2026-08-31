// The structural shape LivePresence*Card.tsx components need — deliberately not tied to the
// generated `LivePresenceItem` SDK type, so these same card components (the actual visual
// grammar: browser-chrome Page preview, status-strip Ad frame, document-shaped Email, social-tile
// Post) can be reused directly from a collection page's own already-fetched list data (Pages/Ads),
// not only from the /home endpoint's cross-surface union.
export type LivePresenceCardData = {
  id: string
  title: string
  href: string
  statusLabel: string
  thumbnailUrl: string | null
  stat1: { value: number; label: string }
  stat2: { value: number; label: string }
}
