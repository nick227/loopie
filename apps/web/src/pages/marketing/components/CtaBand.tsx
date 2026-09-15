import { HomeActions } from './HomeActions'

export function CtaBand() {
  return (
    <section
      aria-labelledby="start-title"
      className="mb-8 rounded-2xl border border-primary/15 bg-primary/5 px-6 py-10 sm:px-10 sm:py-14"
    >
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-12">
        <div>
          <h2 id="start-title" className="text-3xl font-semibold tracking-tight">
            Set up your studio in LOOPIE
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Add your team, plan your first assignment, or publish a page. Talk to us about bringing
            your studio’s tools and client work into LOOPIE.
          </p>
        </div>
        <HomeActions />
      </div>
    </section>
  )
}
