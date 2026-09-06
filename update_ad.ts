import { db } from '@project/db'
async function run() {
  const ad = await db.houseAd.findFirst({ where: { name: 'ttt' } })
  const native = await db.advertisement.findFirst()
  if (ad && native) {
    await db.houseAd.update({ where: { id: ad.id }, data: { advertisementId: native.id } })
    console.log('Updated ad to use native ad', native.id)
  } else {
    console.log('Not found')
  }
}
run()
