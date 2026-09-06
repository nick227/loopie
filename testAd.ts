import { HouseAdService } from './apps/server/src/services/HouseAdService'

async function run() {
  try {
    const service = new HouseAdService()
    const ad = await service.serveAd('HOUSE_AD')
    console.log(ad)
  } catch (e) {
    console.error(e)
  }
}

run()
