import { Link } from 'react-router-dom'
import { CampaignAdRow, type CampaignAd } from '@/components/campaigns/CampaignAdRow'

export function CampaignAds({
  campaignId,
  ads,
  activating,
  onActivate,
}: {
  campaignId: string
  ads: CampaignAd[]
  activating: boolean
  onActivate: (adUnitId: string) => void
}) {
  return (
    <section id="ads" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide uppercase">Ads</h2>
        <div className="flex gap-4 text-sm">
          <Link
            to={`/campaigns/${campaignId}/creatives/new`}
            className="underline underline-offset-4"
          >
            New creative
          </Link>
          <Link
            to={`/campaigns/${campaignId}/ad-units/new`}
            className="underline underline-offset-4"
          >
            New ad
          </Link>
        </div>
      </div>
      {ads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ads yet. An ad runs a creative on this campaign.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">Creative</th>
                <th className="pb-2 pr-6 font-medium">Channel</th>
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
    </section>
  )
}
