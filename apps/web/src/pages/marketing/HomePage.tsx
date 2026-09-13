import { Hero } from './components/Hero'
import { PillarIndex } from './components/PillarIndex'
import { RiverShowcase } from './components/RiverShowcase'
import { CtaBand } from './components/CtaBand'

/**
 * LOOPIE's permanent public homepage, at `/`. Rendered for everyone, signed in or not — see
 * docs/strategy/public-marketing-homepage-proposal.md. Renders inside the same Shell every other
 * page uses (App.tsx wraps it in <Shell/> alongside /river) — no separate marketing header or
 * footer; content sits in Shell's own standard `max-w-5xl` container the same way any other page
 * does. Structure: Hero (with a real product composition) → the four grouped product areas →
 * River (real content) → CTA.
 */
export function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <Hero />
      <PillarIndex />
      <RiverShowcase />
      <CtaBand />
    </div>
  )
}
