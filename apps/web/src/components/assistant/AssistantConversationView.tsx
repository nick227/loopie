// Conversation — a small, quiet aside beneath the Action zone (see AssistantPanel.tsx's
// HomeView), not a browsable feed. 2026-09-04 course correction: showing several routes at once
// (teasers, related-topic chips, a "Keep reading" expansion) made the panel feel like it was doing
// too much and competed with the actual instruction the user opened the Assistant for. Actions are
// where "a lot of ground to cover" actually gets delivered, one directed step at a time — this is
// just a one-line, non-interactive observation underneath it, demoted accordingly: small type, a
// thin top rule to separate it from Action, nothing to click.
type ConversationInsight = {
  id: string
  headline: string
  detail: string | null
}

type Conversation = {
  featuredId: string
  insights: ConversationInsight[]
}

export function AssistantConversationView({ conversation }: { conversation: Conversation }) {
  const featured =
    conversation.insights.find((i) => i.id === conversation.featuredId) ?? conversation.insights[0]
  if (!featured) return null

  return (
    <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      {featured.headline}
      {featured.detail ? ` ${featured.detail}` : ''}
    </p>
  )
}
