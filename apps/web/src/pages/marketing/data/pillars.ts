/**
 * The homepage's pillar index — one entry per real, shipped V1 product surface (see
 * docs/strategy/public-marketing-homepage-proposal.md). Grouped under a plain description of
 * what the group is for; each pillar gets a title and one short, concrete line describing what
 * the user can actually do with it.
 *
 * First-Party Ad Serving is a real, separate delivery mechanism in the product, but isn't listed
 * as its own homepage pillar — Advertising's own `copy` folds it in ("serve ads with full
 * attribution") as one clause of its single sentence, rather than a second sentence or its own
 * row. Forms *is* its own pillar (real, distinct enough to name directly). Nothing about the
 * product itself changed here — this is a homepage copy decision, not a feature cut.
 *
 * Every pillar's `copy` is one sentence, deliberately kept within a narrow, consistent word-count
 * band (roughly 8-10 words) so every cell in the section reads as the same size — no cell should
 * visibly run longer or shorter than its neighbors.
 *
 * PillarIndex.tsx renders every group with the exact same layout — no per-group visual, no
 * featured/anchor capability, no special cases. A group with 2 pillars is simply shorter than one
 * with 4; that's real, not a layout gap to fill.
 */
export interface Pillar {
  id: string
  name: string
  copy: string
}

export interface PillarGroup {
  id: string
  name: string
  description: string
  pillars: Pillar[]
}

export const PILLAR_GROUPS: PillarGroup[] = [
  {
    id: 'bring-in-customers',
    name: 'Bring in customers',
    description: 'Create the ads, pages, forms, and follow-up that turn attention into leads.',
    pillars: [
      {
        id: 'advertising',
        name: 'Advertising',
        copy: 'Create campaigns, publish creative, and serve ads with full attribution.',
      },
      {
        id: 'pages',
        name: 'Landing Pages',
        copy: 'Build and publish hosted pages for campaigns, offers, and events.',
      },
      {
        id: 'forms',
        name: 'Forms',
        copy: 'Capture submissions directly into your contacts and lead pipeline.',
      },
      {
        id: 'messages',
        name: 'Messages & Automation',
        copy: 'Send email and text to your audience, then automate follow-up.',
      },
    ],
  },
  {
    id: 'manage-leads-and-sales',
    name: 'Manage leads and sales',
    description: 'Keep every customer, conversation, opportunity, and sale connected.',
    pillars: [
      {
        id: 'contacts',
        name: 'Contacts & Audiences',
        copy: 'Store customer history, consent, tags, segments, and activity.',
      },
      {
        id: 'pipeline',
        name: 'Leads & Sales Pipeline',
        copy: 'Move opportunities from new lead through proposal, won, or lost.',
      },
    ],
  },
  {
    id: 'plan-track-and-operate',
    name: 'Plan, track, and operate',
    description: 'Coordinate the work behind the business and see what needs attention.',
    pillars: [
      {
        id: 'calendar',
        name: 'Calendar',
        copy: 'Plan goals, schedule work, and see what LOOPIE recommends next.',
      },
      {
        id: 'teams',
        name: 'Teams',
        copy: 'Share the business, assign work, and track team activity.',
      },
      {
        id: 'integrations',
        name: 'CRM Integrations',
        copy: 'Connect Sheets, Shopify, WooCommerce, HubSpot, Salesforce, and webhooks.',
      },
      {
        id: 'ledger',
        name: 'Money & Ledger',
        copy: 'Track ad funding, spend, fees, commissions, and payouts.',
      },
    ],
  },
  {
    id: 'grow-through-partners-and-reach',
    name: 'Grow through partners and reach',
    description: 'Work with referral partners and publish content beyond your own customer list.',
    pillars: [
      {
        id: 'affiliates',
        name: 'Affiliate Partners',
        copy: 'Create partner programs and manage commissions and payouts.',
      },
      {
        id: 'river',
        name: 'River',
        copy: 'Publish business updates, ads, and pages to LOOPIE’s public feed.',
      },
    ],
  },
]
