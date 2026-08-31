import { db } from '@project/db'
async function main() {
  const items = await db.activityItem.findMany()
  console.log(JSON.stringify(items, null, 2))
  process.exit(0)
}
main()
