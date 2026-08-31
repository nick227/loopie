import type { components } from '@project/sdk'
import { LayoutTemplate } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { LivePresencePageCard } from './LivePresencePageCard'
import { LivePresenceAdCard } from './LivePresenceAdCard'
import { LivePresenceEmailCard } from './LivePresenceEmailCard'
import { LivePresencePostCard } from './LivePresencePostCard'

type LivePresenceItem = components['schemas']['LivePresenceItem']

// Different object types get a different silhouette, preview behavior, and information density —
// not just a different icon on an identical rectangle. One dominant Page (a miniature webpage,
// portrait, browser chrome), an Ad stack beside it (compact creative frames, performance-on-
// hover), a tall narrow Email card (a document, not a photo), and a horizontally-browsable Post
// strip beneath (square, media-first, social-grid shaped). Each card type owns its own component
// (LivePresence*Card.tsx) — this file only groups and composes them.
function groupItems(items: LivePresenceItem[]) {
  const pages = items.filter((i) => i.type === 'PAGE')
  const ads = items.filter((i) => i.type === 'AD')
  const posts = items.filter((i) => i.type === 'MESSAGE' && i.channel === 'SOCIAL')
  const emails = items.filter((i) => i.type === 'MESSAGE' && i.channel === 'EMAIL')
  return { pages, ads, posts, emails }
}

export function LivePresenceGrid({ items }: { items: LivePresenceItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="Nothing live yet"
        description="Publish a page, launch an ad, or send a message to see it here."
      />
    )
  }

  const { pages, ads, posts, emails } = groupItems(items)
  const feature = pages[0]
  const stackAds = ads.slice(0, 2)
  const email = emails[0]
  const hasFeatureRow = Boolean(feature || stackAds.length || email)

  return (
    <div className="space-y-3">
      {hasFeatureRow ? (
        <div className="w-full">
          {feature ? <LivePresencePageCard item={feature} className="sm:col-span-2" /> : null}
          {stackAds.length ? (
            <div
              className={cn(
                'flex h-72 flex-col gap-3',
                feature ? 'sm:col-span-1' : email ? 'sm:col-span-2' : 'sm:col-span-4',
              )}
            >
              {stackAds.map((ad) => (
                <LivePresenceAdCard key={ad.id} item={ad} />
              ))}
            </div>
          ) : null}
          {email ? (
            <LivePresenceEmailCard
              item={email}
              className={feature || stackAds.length ? 'sm:col-span-1' : 'sm:col-span-4'}
            />
          ) : null}
        </div>
      ) : null}

      {posts.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Recent posts">
          {posts.map((post) => (
            <LivePresencePostCard key={post.id} item={post} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
