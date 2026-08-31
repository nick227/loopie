import { db } from '@project/db'
async function main() {
  const user = await db.user.findFirst({ where: { email: 'demo@loopie.app' } })
  const cookie = `session=${user.id}`
  const res = await fetch('http://127.0.0.1:3001/activity', {
    headers: { Cookie: cookie },
  })
  console.log(res.status)
  console.log(await res.text())
  process.exit(0)
}
main()
