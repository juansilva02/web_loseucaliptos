import { Router } from 'express'
import { writeFileSync, mkdirSync } from 'node:fs'
import { stat, unlink } from 'node:fs/promises'
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
const SAFE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function sanitizeFileName(fileName) {
  const name = String(fileName).replace(/\.\.\//g, '').replace(/\.\.\\/g, '')
  const base = name.split(/[/\\]/).pop()
  if (!base || !SAFE_NAME_RE.test(base)) return null
  return base
}

function slugifyProductId(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized || !SAFE_ID_RE.test(normalized)) return null
  return normalized
}

function sanitizeUploadUrl(value) {
  const path = String(value || '').trim()
  if (!path.startsWith('/uploads/')) return null
  return sanitizeFileName(path.slice('/uploads/'.length))
}

function getImageExtension(dataUrl) {
  const raw = String((/^data:image\/([a-z0-9.+-]+);/i.exec(dataUrl || '')?.[1] || 'png')).toLowerCase()
  if (raw === 'jpeg') return '.jpg'
  if (raw === 'svg+xml') return '.svg'
  return `.${raw}`
}

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { productId, dataUrl, currentImageUrl } = req.body
  if (!productId || !dataUrl) {
    return res.status(400).json({ error: 'productId y dataUrl son requeridos' })
  }

  const canonicalId = slugifyProductId(productId)
  if (!canonicalId) {
    return res.status(400).json({ error: 'Identificador de producto invalido' })
  }

  const base64 = dataUrl.split(',')[1]
  if (!base64) return res.status(400).json({ error: 'dataUrl invalido' })

  try {
    mkdirSync(UPLOADS_DIR, { recursive: true })
    const ext = getImageExtension(dataUrl)

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: 'Formato de imagen no soportado. Permitidos: webp, jpg, png' })
    }

    let buffer = Buffer.from(base64, 'base64')

    buffer = await sharp(buffer)
      .resize(MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer()

    const webpName = `${canonicalId}.webp`
    const outPath = join(UPLOADS_DIR, webpName)
    writeFileSync(outPath, buffer)

    const previousFileName = sanitizeUploadUrl(currentImageUrl)
    if (previousFileName && previousFileName !== webpName) {
      await unlink(join(UPLOADS_DIR, previousFileName)).catch(() => {})
    }

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
