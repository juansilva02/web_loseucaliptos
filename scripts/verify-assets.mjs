import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const outputDir = process.argv[2] || 'dist'
const baseUrl = process.argv[3]?.replace(/\/$/, '') || ''
const htmlFiles = ['index.html', join('catalogo', 'index.html')]
const assetPaths = new Set()

for (const relativePath of htmlFiles) {
  const html = await readFile(join(outputDir, relativePath), 'utf8')
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
    assetPaths.add(match[1])
  }
}

for (const assetPath of assetPaths) {
  await access(join(outputDir, assetPath.slice(1)))
  if (!baseUrl) continue
  const response = await fetch(`${baseUrl}${assetPath}`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`${assetPath} respondio HTTP ${response.status}`)
}

console.log(`[assets] ${assetPaths.size} referencias verificadas${baseUrl ? ' en produccion' : ''}`)
