import bcrypt from 'bcryptjs'
import { db } from '../src/client'
import { SEED_ACCOUNTS, SEED_PASSWORD, seedBusinessesAndUsers } from './seed/accounts'
import { seedRiversideDemo } from './seed/riverside'
import { seedAffiliates } from './seed/affiliates'

async function main() {
  console.log('Seeding...')
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12)
  const { riverside, oak, users } = await seedBusinessesAndUsers(passwordHash)
  const { landingPage } = await seedRiversideDemo(riverside.id)
  await seedAffiliates({
    riversideId: riverside.id,
    oakId: oak.id,
    landingPageId: landingPage.id,
    users,
  })

  console.log(
    `Seeded "${riverside.name}" + "${oak.name}". Password for every login: ${SEED_PASSWORD}`,
  )
  for (const a of SEED_ACCOUNTS) {
    const tenant = a.businessId === riverside.id ? 'Riverside' : 'Oak Street'
    console.log(`  ${a.email.padEnd(32)} ${a.role.padEnd(10)} ${tenant.padEnd(12)} ${a.label}`)
  }
  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
