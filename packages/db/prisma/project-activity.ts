import { PrismaClient } from '@prisma/client'
import { LeadProjector } from '../../../apps/server/src/services/activity/LeadProjector'
import { FormSubmissionProjector } from '../../../apps/server/src/services/activity/FormSubmissionProjector'
import { PageProjector } from '../../../apps/server/src/services/activity/PageProjector'
import { AdRunProjector } from '../../../apps/server/src/services/activity/AdRunProjector'
import { AutomationProjector } from '../../../apps/server/src/services/activity/AutomationProjector'
import { SaleProjector } from '../../../apps/server/src/services/activity/SaleProjector'

const db = new PrismaClient()

async function main() {
  console.log('Starting backfill projection...')

  // 1. Leads
  const leads = await db.lead.findMany({ include: { contact: true } })
  console.log(`Projecting ${leads.length} leads...`)
  for (const lead of leads) {
    await LeadProjector.project(lead, lead.contact)
  }

  // 2. Form Submissions
  const forms = await db.formSubmission.findMany({ include: { form: true, contact: true } })
  console.log(`Projecting ${forms.length} form submissions...`)
  for (const sub of forms) {
    await FormSubmissionProjector.project(sub, sub.form, sub.contact)
  }

  // 3. Pages
  const pages = await db.landingPage.findMany()
  console.log(`Projecting ${pages.length} pages...`)
  for (const page of pages) {
    await PageProjector.project(page)
  }

  // 4. Ad Runs
  const runs = await db.adRun.findMany({ include: { advertisement: true } })
  console.log(`Projecting ${runs.length} ad runs...`)
  for (const run of runs) {
    await AdRunProjector.project(run, run.advertisement)
  }

  // 5. Automations
  const logs = await db.automationLog.findMany({ include: { automation: true } })
  console.log(`Projecting ${logs.length} automation logs...`)
  for (const log of logs) {
    await AutomationProjector.project(log, log.automation)
  }

  // 6. Sales
  const sales = await db.sale.findMany({ include: { contact: true } })
  console.log(`Projecting ${sales.length} sales...`)
  for (const sale of sales) {
    await SaleProjector.project(sale, sale.contact)
  }

  // Verify counts
  const activityCount = await db.activityItem.count()
  const attentionCount = await db.attentionItem.count()
  console.log(`\nProjection Complete!`)
  console.log(`Activity Items in DB: ${activityCount}`)
  console.log(`Attention Items in DB: ${attentionCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
