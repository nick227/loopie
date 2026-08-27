import type { CampaignAd } from '@/components/campaigns/CampaignAdCard'
import { CampaignAdCard } from '@/components/campaigns/CampaignAdCard'

type LibraryAd = { id: string; name: string }

export function CampaignAds({
  ads,
  library,
  attaching,
  activating,
  onAttach,
  onActivate,
  pushReady,
  pushingId,
  onPush,
}: {
  ads: CampaignAd[]
  library: LibraryAd[]
  attaching: boolean
  activating: boolean
  onAttach: (creativeId: string) => void
  onActivate: (adUnitId: string) => void
  pushReady?: Record<string, boolean>
  pushingId?: string | null
  onPush?: (deploymentId: string) => void
}) {
  const primaryAd = ads[0]

  return (
    <section id="ads" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide uppercase">Ad Creative</h2>
      </div>

      {primaryAd ? (
        <div className="space-y-4">
          <CampaignAdCard
            ad={primaryAd}
            activating={activating}
            onActivate={onActivate}
            pushReady={pushReady}
            pushingId={pushingId}
            onPush={onPush}
          />
          {library.length > 0 && (
            <div className="pt-2">
              <label
                htmlFor="attach-ad"
                className="text-xs uppercase tracking-[0.14em] text-muted-foreground block mb-2"
              >
                Replace Ad
              </label>
              <select
                id="attach-ad"
                disabled={attaching}
                defaultValue=""
                onChange={(event) => {
                  const creativeId = event.target.value
                  if (!creativeId) return
                  onAttach(creativeId)
                  event.target.value = ''
                }}
                className="flex h-10 w-full max-w-sm rounded-lg border border-input-border bg-transparent px-3 text-sm"
              >
                <option value="">Choose an ad to replace...</option>
                {library.map((ad) => (
                  <option key={ad.id} value={ad.id}>
                    {ad.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border border-dashed p-8 text-center bg-card/50">
          <p className="text-sm text-muted-foreground mb-4">No ad attached to this campaign.</p>
          <div className="flex flex-col items-center max-w-xs mx-auto">
            <label
              htmlFor="attach-ad"
              className="text-xs uppercase tracking-[0.14em] text-muted-foreground block mb-2"
            >
              Attach an ad
            </label>
            <select
              id="attach-ad"
              disabled={attaching || library.length === 0}
              defaultValue=""
              onChange={(event) => {
                const creativeId = event.target.value
                if (!creativeId) return
                onAttach(creativeId)
                event.target.value = ''
              }}
              className="flex h-10 w-full rounded-lg border border-input-border bg-transparent px-3 text-sm text-left"
            >
              <option value="">{library.length === 0 ? 'No ads available' : 'Choose an ad'}</option>
              {library.map((ad) => (
                <option key={ad.id} value={ad.id}>
                  {ad.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  )
}
