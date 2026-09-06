import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function run() {
  console.log(await db.houseAd.findMany())
}
run()
