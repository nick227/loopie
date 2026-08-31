import fs from 'fs'
import path from 'path'

function checkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    const res = path.resolve(dir, file.name)
    if (file.isDirectory()) {
      checkDir(res)
    } else if (res.endsWith('.tsx') || res.endsWith('.ts')) {
      const content = fs.readFileSync(res, 'utf8')
      const lines = content.split('\n')
      let insideMap = false
      let mapBraceCount = 0
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // This is a naive heuristic
        if (line.match(/\.map\s*\(\s*\w+\s*=>/)) {
          insideMap = true
          mapBraceCount += (line.match(/\{/g) || []).length
          mapBraceCount -= (line.match(/\}/g) || []).length
        } else if (insideMap) {
          mapBraceCount += (line.match(/\{/g) || []).length
          mapBraceCount -= (line.match(/\}/g) || []).length
          if (line.includes('.filter(') || line.includes('.find(')) {
             console.log(`Found nested filter/find at ${res}:${i+1}`)
          }
          if (mapBraceCount <= 0 && line.includes('}')) {
             insideMap = false
          }
        }
      }
    }
  }
}
checkDir(path.resolve('./src'))
