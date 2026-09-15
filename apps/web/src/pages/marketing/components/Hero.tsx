import { ArrowDown } from 'lucide-react'
import { HomeActions } from './HomeActions'

export function Hero() {
  return (
    <section aria-labelledby="home-title" className="pb-14 pt-8 sm:pb-20 sm:pt-16">
      <h1
        id="home-title"
        className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl"
      >
        Plan your business, launch <span className="text-primary">pages and ads</span>, and handle
        messaging on one platform.
      </h1>
      <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          LOOPIE brings your calendar, team assignments, pages, advertisements, contacts, and shared
          inbox together—with connections to the platforms your clients already use.
        </p>
        <HomeActions />
      </div>
      <a
        href="#pillars"
        className="mt-10 inline-flex items-center gap-2 rounded text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-14"
      >
        Explore the tools <ArrowDown size={16} aria-hidden="true" />
      </a>
    </section>
  )
}
