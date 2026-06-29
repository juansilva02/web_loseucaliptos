import { Router } from 'express'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { requireAuth } from '../auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const MAX_WIDTH = 800
const QUALITY = 80

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { fileName, dataUrl } = req.body
  if (!fileName || !dataUrl) {
    return res.status(400).json({ error: 'fileName y dataUrl son requeridos' })
  }

  const base64 = dataUrl.split(',')[1]
  if (!base64) return res.status(400).json({ error: 'dataUrl inválido' })

  try {
    mkdirSync(UPLOADS_DIR, { recursive: true })
    const ext = extname(fileName).toLowerCase()
    const baseName = fileName.replace(/\.[^.]+$/, '')
    let buffer = Buffer.from(base64, 'base64')

    if (ext === '.webp' || ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      buffer = await sharp(buffer)
        .resize(MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()
      const webpName = baseName + '.webp'
      const outPath = join(UPLOADS_DIR, webpName)
      writeFileSync(outPath, buffer)
      const stats = await import('node:fs/promises').then(m => m.stat(outPath))
      return res.json({
        fileName: webpName,
        url: `/uploads/${webpName}`,
        size: stats.size,
        originalSize: Math.round(base64.length * 0.75),
      })
    }

    const outPath = join(UPLOADS_DIR, fileName)
    writeFileSync(outPath, buffer)
    const stats = await import('node:fs/promises').then(m => m.stat(outPath))
    res.json({
      fileName,
      url: `/uploads/${fileName}`,
      size: stats.size,
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la imagen', detail: err.message })
  }
})

export default router
