// One-time (but safely repeatable) backfill: projects ActivityItem rows for the deterministic
// demo-seed CRM/sales/ad data (packages/db/prisma/seed/showcase.ts + riverside.ts), which was
// written with direct db.*.create() calls, bypassing the service-layer call sites that normally
// trigger ActivityProjectionService. Without this, a fresh `pnpm db:seed` produces real leads/
// sales/ad runs with zero corresponding Activity — Home's activity feed looks dead even though
// the CRM data exists. See the seed-data-audit conversation.
//
// Deliberately scoped to the seed's own known deterministic ids, not a whole-database scan — the
// shared dev DB also holds a lot of unrelated, organically-accumulated real usage data this script
// has no business touching. BaseProjector.upsertActivity is a real upsert keyed on
// (businessId, sourceKind, sourceRecordType, sourceRecordId, eventKey), so rerunning this against
// an already-backfilled database is a safe no-op, not a duplicate.
//
// Usage: pnpm --filter server run seed:activity-backfill (chained after `pnpm db:seed` at the
// root — see package.json). Can also be run standalone any time after re-seeding.
import { db } from '@project/db'
import { LeadProjector } from '../src/services/activity/LeadProjector'
import { SaleProjector } from '../src/services/activity/SaleProjector'
import { AdRunProjector } from '../src/services/activity/AdRunProjector'
import { PageProjector } from '../src/services/activity/PageProjector'

const SEED_LEAD_IDS = [
  'demo-lead-jane',
  'demo-lead-marcus',
  'demo-lead-sarah',
  'demo-lead-derek',
  'demo-lead-priya',
  'demo-lead-chris',
]
const SEED_SALE_IDS = ['demo-sale-priya']
const SEED_AD_RUN_IDS = ['demo-adrun-meta', 'demo-adrun-google']
const SEED_LANDING_PAGE_IDS = ['demo-landing-page-raw-stories']

async function backfillLeads() {
  let created = 0
  let statusChanged = 0
  for (const id of SEED_LEAD_IDS) {
    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) continue
    const contact = await db.contact.findUnique({ where: { id: lead.contactId } })
    if (!contact) continue

    await LeadProjector.project(lead, contact)
    created++

    // One coherent "moved from X to current stage" event per lead, using the earliest recorded
    // stage change as the starting point — projectStatusChange's eventKey is keyed off the lead's
    // *current* stage, so calling it more than once per lead would just overwrite the same row.
    const firstChange = await db.interaction.findFirst({
      where: { contactId: contact.id, type: 'STATUS_CHANGE' },
      orderBy: { occurredAt: 'asc' },
    })
    if (firstChange) {
      const metadata = firstChange.metadata as { from?: string } | null
      if (metadata?.from) {
        await LeadProjector.projectStatusChange(lead, contact, metadata.from)
        statusChanged++
      }
    }
  }
  return { created, statusChanged }
}

async function backfillSales() {
  let count = 0
  for (const id of SEED_SALE_IDS) {
    const sale = await db.sale.findUnique({ where: { id } })
    if (!sale) continue
    const contact = await db.contact.findUnique({ where: { id: sale.contactId } })
    if (!contact) continue
    await SaleProjector.project(sale, contact)
    count++
  }
  return count
}

async function backfillAdRuns() {
  let count = 0
  for (const id of SEED_AD_RUN_IDS) {
    const adRun = await db.adRun.findUnique({ where: { id } })
    if (!adRun) continue
    const advertisement = await db.advertisement.findUnique({
      where: { id: adRun.advertisementId },
    })
    if (!advertisement) continue
    await AdRunProjector.project(adRun, advertisement)
    count++
  }
  return count
}

async function backfillLandingPages() {
  let count = 0
  for (const id of SEED_LANDING_PAGE_IDS) {
    const page = await db.landingPage.findUnique({ where: { id } })
    if (!page) continue
    await PageProjector.project(page)
    count++
  }
  return count
}

async function main() {
  const leads = await backfillLeads()
  const sales = await backfillSales()
  const adRuns = await backfillAdRuns()
  const pages = await backfillLandingPages()
  const total = await db.activityItem.count()

  console.log(
    [
      `Leads projected (LEAD_CREATED): ${leads.created}`,
      `Leads projected (LEAD_STATUS_CHANGED): ${leads.statusChanged}`,
      `Sales projected: ${sales}`,
      `Ad runs projected: ${adRuns}`,
      `Landing pages projected: ${pages}`,
      `ActivityItem rows in the database now: ${total}`,
    ].join('\n'),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
