import fs from 'fs'
import path from 'path'

function getFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  let results = []
  for (const file of files) {
    const res = path.resolve(dir, file.name)
    if (file.isDirectory()) {
      results = results.concat(getFiles(res))
    } else if (res.endsWith('.tsx') || res.endsWith('.ts')) {
      results.push(res)
    }
  }
  return results
}

const files = getFiles(path.resolve('./src'))

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  if (content.includes('useFlatPages(') && !content.includes('import { useFlatPages }')) {
    const lastImportIndex = content.lastIndexOf('import ')
    const nextLineIndex = content.indexOf('\n', lastImportIndex)
    const importStr = `\nimport { useFlatPages } from '@/hooks/useFlatPages'`
    content = content.slice(0, nextLineIndex) + importStr + content.slice(nextLineIndex)
    fs.writeFileSync(file, content)
    console.log(`Added import to ${file}`)
  }
}
