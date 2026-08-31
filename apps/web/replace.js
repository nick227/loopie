/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

const dir =
  '/home/administrator/web/midnightcreative/apps/web/src/components/landing-pages/templates'

fs.readdirSync(dir).forEach((file) => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file)
    let content = fs.readFileSync(filePath, 'utf8')
    content = content.replace(
      /data\.title\.split\('-'\)\[0\]\.trim\(\)/g,
      "(data.title.split('-')[0] || '').trim()",
    )
    fs.writeFileSync(filePath, content)
  }
})
