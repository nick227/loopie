import { useState } from 'react'
import { Users, UserPlus, UserCheck, DollarSign, Trophy } from 'lucide-react'
import { useContacts } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'
import { CollectionInsightsPanel } from '@/components/welcome/CollectionInsightsPanel'

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

// Contacts-specific highlights, replacing the generic cross-surface WelcomeSection on this
// collection — the same icon-tile metrics panel Pages/Advertising use, from their own unfiltered
// query, not whatever search/source filter the collection list below happens to be showing right
// now (ContactsPage's own `items` changes as the user types a search — these stats shouldn't
// wobble along with it). Highlight line names the top customer by revenue rather than a media
// card — a person is a row, never a media tile.
export function ContactsCollectionInsights() {
  const query = useContacts()
  const contacts = useFlatPages(query)
  // Fixed once per mount, not recomputed on every render — a stable "recent" boundary for one
  // visit, not something that should shift moment-to-moment as the page sits open.
  const [sevenDaysAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000)

  if (query.isLoading || contacts.length === 0) return null
  const customers = contacts.filter((c) => c.lifecycleStatus === 'CUSTOMER').length
  const newThisWeek = contacts.filter((c) => new Date(c.createdAt).getTime() >= sevenDaysAgo).length
  const totalRevenue = contacts.reduce((sum, c) => sum + (c.revenue ?? 0), 0)
  const top = [...contacts].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0]
  const best = top && (top.revenue ?? 0) > 0 ? top : null

  return (
    <CollectionInsightsPanel
      stats={[
        {
          icon: Users,
          value: `${contacts.length}${query.hasNextPage ? '+' : ''}`,
          label: 'contacts',
        },
        { icon: UserPlus, value: String(newThisWeek), label: 'new this week' },
        { icon: UserCheck, value: String(customers), label: 'customers' },
        { icon: DollarSign, value: money(totalRevenue), label: 'total revenue' },
      ]}
      highlight={
        best
          ? {
              icon: Trophy,
              href: `/contacts/${best.id}`,
              children: (
                <>
                  Top customer: <span className="font-medium text-foreground">{best.name}</span> ·{' '}
                  {money(best.revenue ?? 0)}
                </>
              ),
            }
          : undefined
      }
    />
  )
}
