import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const outboxes = await prisma.embedProjectionOutbox.findMany()
  console.log('OUTBOXES:', outboxes)
  const submissions = await prisma.formSubmission.findMany()
  console.log('SUBMISSIONS:', submissions)
  const activities = await prisma.activityItem.findMany()
  console.log('ACTIVITIES:', activities)
}
main().finally(() => prisma.$disconnect())
