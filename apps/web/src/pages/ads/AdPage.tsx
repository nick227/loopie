import { Link, useParams } from 'react-router-dom'
import { useCreative } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function AdPage() {
  const { adId } = useParams<{ adId: string }>()
  const { data, isLoading } = useCreative(adId!)

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const item = data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">Version {item.version}</p>
        </div>
        <Link to={`/ads/${item.id}/edit`}>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </Link>
      </div>

      {item.previewUrl ? (
        <img src={item.previewUrl} alt="" className="max-h-56 rounded object-cover" />
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Views</p>
          <p className="tabular-nums mt-1">{item.impressions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Clicks</p>
          <p className="tabular-nums mt-1">{item.clicks.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Conversions
          </p>
          <p className="tabular-nums mt-1">{item.conversions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Spend</p>
          <p className="tabular-nums mt-1">{money(item.spend)}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide uppercase">Campaigns</h2>
        {item.campaigns && item.campaigns.length > 0 ? (
          <ul className="text-sm space-y-1">
            {item.campaigns.map((campaign) => (
              <li key={campaign.id}>
                <Link to={`/campaigns/${campaign.id}`} className="underline underline-offset-4">
                  {campaign.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not used on any campaign.</p>
        )}
      </section>
    </div>
  )
}
