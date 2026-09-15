import { Hero } from './components/Hero'
import { PillarIndex } from './components/PillarIndex'
import { CtaBand } from './components/CtaBand'

/** Public product overview inside the shared Shell, for visitors and signed-in users. */
export function HomePage() {
  return (
    <div>
      <Hero />
      <PillarIndex />
      <CtaBand />
    </div>
  )
}
