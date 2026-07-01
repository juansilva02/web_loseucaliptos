import { Router } from 'express'
import { writeFileSync, mkdirSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { requireAuth } from '../auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const MAX_WIDTH = 800
const QUALITY = 80
const ALLOWED_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png']
const SAFE_NAME_RE = /^[\w.\-]+$/

function sanitizeFileName(fileName) {
  const name = String(fileName).replace(/\.\.\//g, '').replace(/\.\.\\/g, '')
  const base = name.split(/[/\\]/).pop()
  if (!base || !SAFE_NAME_RE.test(base)) return null
  return base
}

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { fileName, dataUrl } = req.body
  if (!fileName || !dataUrl) {
    return res.status(400).json({ error: 'fileName y dataUrl son requeridos' })
  }

  const safeName = sanitizeFileName(fileName)
  if (!safeName) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' })
  }

  const base64 = dataUrl.split(',')[1]
  if (!base64) return res.status(400).json({ error: 'dataUrl inválido' })

  try {
    mkdirSync(UPLOADS_DIR, { recursive: true })
    const ext = '.' + safeName.split('.').pop().toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: 'Formato de imagen no soportado. Permitidos: webp, jpg, png' })
    }

    const baseName = safeName.replace(/\.[^.]+$/, '')
    let buffer = Buffer.from(base64, 'base64')

    buffer = await sharp(buffer)
      .resize(MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer()

    const webpName = baseName + '.webp'
    const outPath = join(UPLOADS_DIR, webpName)
    writeFileSync(outPath, buffer)
    const fileStats = await stat(outPath)
    res.json({
      fileName: webpName,
      url: `/uploads/${webpName}`,
      size: fileStats.size,
      originalSize: Math.round(base64.length * 0.75),
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la imagen' })
  }
})

export default router
