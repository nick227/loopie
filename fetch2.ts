import { db } from '@project/db'
async function main() {
  const loginRes = await fetch('http://127.0.0.1:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@loopie.app', password: 'demo' }),
  })
  const cookie = loginRes.headers.get('set-cookie')

  const res = await fetch('http://127.0.0.1:3001/activity', {
    headers: { Cookie: cookie! },
  })
  console.log(res.status)
  console.log(await res.text())
  process.exit(0)
}
main()
