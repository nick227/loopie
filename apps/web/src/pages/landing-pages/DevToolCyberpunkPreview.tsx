import { DevToolCyberpunk } from '@/components/landing-pages/templates/DevToolCyberpunk'
import { devToolCyberpunkData } from '@project/db/src/data/dev-tool-cyberpunk'

export function DevToolCyberpunkPreview() {
  return (
    <div className="w-full">
      <DevToolCyberpunk data={devToolCyberpunkData} />
    </div>
  )
}
