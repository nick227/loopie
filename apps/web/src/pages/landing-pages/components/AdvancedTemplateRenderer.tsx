import { AppWaitlistNeon } from '@/components/landing-pages/templates/AppWaitlistNeon'
import { AgencyOrganic } from '@/components/landing-pages/templates/AgencyOrganic'
import { CreatorBrutalist } from '@/components/landing-pages/templates/CreatorBrutalist'
import { DevToolCyberpunk } from '@/components/landing-pages/templates/DevToolCyberpunk'
import { EcommerceGradient } from '@/components/landing-pages/templates/EcommerceGradient'
import { EventPastel } from '@/components/landing-pages/templates/EventPastel'
import { HealthcareTelehealth } from '@/components/landing-pages/templates/HealthcareTelehealth'
import { RealEstateLuxury } from '@/components/landing-pages/templates/RealEstateLuxury'
import { SaaSCleanCrisp } from '@/components/landing-pages/templates/SaaSCleanCrisp'
import { Web3Crypto } from '@/components/landing-pages/templates/Web3Crypto'
import { PageModel } from '@project/db/src/content'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

function DefaultPreview() {
  return <div>Preview not available</div>
}

export function AdvancedTemplateRenderer({
  templateId,
  content,
  setContent,
  setDirty,
}: {
  templateId: string
  content: unknown
  setContent: (c: unknown) => void
  setDirty: (d: boolean) => void
}) {
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value) as unknown
      setContent(parsed)
      setJsonError(null)
      setDirty(true)
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  let Preview: React.ComponentType<{ data?: PageModel }> = DefaultPreview
  switch (templateId) {
    case 'system-template-app-waitlist-neon':
      Preview = AppWaitlistNeon
      break
    case 'system-template-agency-organic':
      Preview = AgencyOrganic
      break
    case 'system-template-creator-brutalist':
      Preview = CreatorBrutalist
      break
    case 'system-template-dev-tool-cyberpunk':
      Preview = DevToolCyberpunk
      break
    case 'system-template-ecommerce-gradient':
      Preview = EcommerceGradient
      break
    case 'system-template-event-pastel':
      Preview = EventPastel
      break
    case 'system-template-healthcare-telehealth':
      Preview = HealthcareTelehealth
      break
    case 'system-template-real-estate-luxury':
      Preview = RealEstateLuxury
      break
    case 'system-template-saas-clean-crisp':
      Preview = SaaSCleanCrisp
      break
    case 'system-template-web3-crypto':
      Preview = Web3Crypto
      break
    default:
      Preview = DefaultPreview
  }

  // Ensure content matches the PageModel shape roughly
  const data =
    typeof content === 'object' &&
    content !== null &&
    'blocks' in content &&
    (content as { blocks: unknown }).blocks
      ? content
      : {
          blocks: [],
          navLinks: [],
          title: '',
          seo: { title: '', description: '' },
          theme: {},
        }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          This is an advanced layout. Edit data in JSON mode to customize it.
        </p>
        <Button variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
          {jsonMode ? 'Show Preview' : 'Edit JSON Data'}
        </Button>
      </div>

      {jsonMode ? (
        <div className="space-y-2">
          <textarea
            className="w-full h-96 p-4 font-mono text-sm bg-muted rounded-xl border border-input-border"
            defaultValue={JSON.stringify(content, null, 2)}
            onChange={handleJsonChange}
          />
          {jsonError && <p className="text-red-500 text-sm">{jsonError}</p>}
        </div>
      ) : (
        <div className="border border-input-border rounded-xl overflow-hidden bg-background pointer-events-none relative shadow-sm">
          {/* We scale the preview down slightly so it fits in the editor */}
          <div className="origin-top-left scale-90 w-[111%]">
            <Preview data={data as PageModel} />
          </div>
        </div>
      )}
    </div>
  )
}
