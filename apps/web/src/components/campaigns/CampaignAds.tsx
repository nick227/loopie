import type { CampaignAd } from '@/components/campaigns/CampaignAdRow'
import { CampaignAdRow } from '@/components/campaigns/CampaignAdRow'

type LibraryAd = { id: string; name: string }

export function CampaignAds({
  ads,
  library,
  attaching,
  activating,
  onAttach,
  onActivate,
}: {
  ads: CampaignAd[]
  library: LibraryAd[]
  attaching: boolean
  activating: boolean
  onAttach: (creativeId: string) => void
  onActivate: (adUnitId: string) => void
}) {
  return (
    <section id="ads" className="space-y-3">
      <h2 className="text-sm font-medium tracking-wide uppercase">Ads</h2>
      {ads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ads on this campaign.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">Ad</th>
                <th className="pb-2 pr-6 font-medium">Channels</th>
                <th className="pb-2 pr-6 font-medium">Status</th>
                <th className="pb-2 pr-6 font-medium text-right">Views</th>
                <th className="pb-2 pr-6 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <CampaignAdRow
                  key={ad.id}
                  ad={ad}
                  activating={activating}
                  onActivate={onActivate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <label
          htmlFor="attach-ad"
          className="text-xs uppercase tracking-[0.14em] text-muted-foreground"
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
          className="mt-1 flex h-10 w-full max-w-sm rounded-lg border border-input-border bg-transparent px-3 text-sm"
        >
          <option value="">{library.length === 0 ? 'No ads available' : 'Choose an ad'}</option>
          {library.map((ad) => (
            <option key={ad.id} value={ad.id}>
              {ad.name}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
