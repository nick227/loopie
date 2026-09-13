import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useRiverFeed } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { RiverPostMedia, RiverPostHeaderChrome } from '@/components/river/RiverPostPresentation'
import { relativeTime } from '@/components/home/homeFormat'

const SHOWN_COUNT = 3

/**
 * The homepage's one deliberate break from typographic/software chrome into real content, per
 * docs/strategy/public-marketing-homepage-proposal.md's "Visual design direction" and "Pillar
 * index treatment": rather than a manually captured screenshot, this pulls real, live posts from
 * River's own public feed (GET /river/feed — already anonymous-capable, the same endpoint the
 * public /river page itself uses) so the section is genuinely real and stays current on its own,
 * instead of needing to be re-captured by hand every time it goes stale.
 */
export function RiverShowcase() {
  const feed = useRiverFeed()
  const items = useMemo(() => {
    const all = feed.data?.pages.flatMap((page) => page.items) ?? []
    return all.filter((item) => (item.media?.length ?? 0) > 0 || item.body).slice(0, SHOWN_COUNT)
  }, [feed.data])

  return (
    <section className="rounded-2xl bg-muted/40 p-6 sm:p-10">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              River
            </h2>
            <p className="mt-3 text-muted-foreground">
              River is LOOPIE’s public feed. Businesses post updates, ads, and pages there, and
              anyone can browse it without an account. The posts below are real, current posts from
              River right now.
            </p>
          </div>
          <Link to="/river">
            <Button variant="outline">See River</Button>
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-3">
            {/* One larger lead post beside two smaller supporting posts — an editorial split
                rather than three equal cards, per the design direction's asymmetric preference. */}
            {items[0] && (
              <div className="space-y-4 lg:col-span-2">
                <RiverPostHeaderChrome
                  avatarSrc={items[0].business.logoUrl}
                  name={items[0].business.name}
                  subtitle={relativeTime(items[0].publishedAt)}
                  to={items[0].business.slug ? `/b/${items[0].business.slug}` : undefined}
                  large
                />
                <RiverPostMedia
                  images={(items[0].media ?? [])
                    .filter((m) => m.type === 'IMAGE')
                    .map((m) => m.url)}
                  video={items[0].media?.find((m) => m.type === 'VIDEO')?.url}
                />
                {items[0].body ? (
                  <p className="max-w-xl text-base text-foreground">{items[0].body}</p>
                ) : null}
              </div>
            )}
            <div className="flex flex-col gap-8">
              {items.slice(1).map((item) => (
                <div key={item.id} className="space-y-2.5">
                  <RiverPostHeaderChrome
                    avatarSrc={item.business.logoUrl}
                    name={item.business.name}
                    subtitle={relativeTime(item.publishedAt)}
                    to={item.business.slug ? `/b/${item.business.slug}` : undefined}
                  />
                  <RiverPostMedia
                    images={(item.media ?? []).filter((m) => m.type === 'IMAGE').map((m) => m.url)}
                    video={item.media?.find((m) => m.type === 'VIDEO')?.url}
                  />
                  {item.body ? (
                    <p className="line-clamp-2 text-sm text-foreground">{item.body}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : !feed.isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Real posts from LOOPIE businesses will appear here as they’re published.
          </p>
        ) : null}
      </div>
    </section>
  )
}
