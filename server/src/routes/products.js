import crypto from 'node:crypto'
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { Router } from 'express'
import sharp from 'sharp'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { writeAudit } from '../audit.js'
import {
  parsePositiveInteger,
  validateProductId,
  validateProductInput,
  validationError,
} from '../validation.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, '..', '..', 'uploads')
const router = Router()
const imageBody = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '8mb',
})

const PRODUCT_FIELDS = [
  'name',
  'category_key',
  'brand',
  'unit',
  'price',
  'image_url',
  'featured',
  'sort',
  'active',
  'search_aliases',
  'search_measurements',
  'search_applications',
]

function escapeLike(value) {
  return String(value || '').replace(/[\\%_]/g, '\\$&')
}

function ensureCategory(categoryKey) {
  if (!categoryKey) return
  const category = db.prepare('SELECT key FROM categories WHERE key = ?').get(categoryKey)
  if (!category) throw validationError(`La categoria "${categoryKey}" no existe`)
}

function updateProductRecord(id, patch, { expectedVersion } = {}) {
  const fields = PRODUCT_FIELDS.filter((field) => patch[field] !== undefined)
  if (!fields.length) throw validationError('Sin campos para actualizar')
  const sets = fields.map((field) => `${field} = @${field}`)
  const params = { id, ...patch }
  sets.push("updated_at = datetime('now')", 'version = version + 1')

  let where = 'id = @id'
  if (expectedVersion !== undefined) {
    where += ' AND version = @expectedVersion'
    params.expectedVersion = expectedVersion
  }
  return db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE ${where}`).run(params)
}

router.get('/', requireAuth, (req, res) => {
  const search = String(req.query.q || '').trim()
  const category = String(req.query.category || '').trim()
  const includeInactive = req.query.all === '1'
  const maxLimit = includeInactive ? 2500 : 500
  const limit = parsePositiveInteger(req.query.limit, maxLimit, { max: maxLimit })
  const offset = parsePositiveInteger(req.query.offset, 0, { min: 0, max: 100000 })
  let where = ' WHERE 1=1'
  const params = { limit, offset }

  if (!includeInactive) where += ' AND active = 1'
  if (category) {
    where += ' AND category_key = @category'
    params.category = category
  }
  if (search) {
    where += " AND (name LIKE @search ESCAPE '\\' OR brand LIKE @search ESCAPE '\\')"
    params.search = `%${escapeLike(search)}%`
  }

  const products = db.prepare(
    `SELECT * FROM products${where} ORDER BY sort, name LIMIT @limit OFFSET @offset`,
  ).all(params)
  const total = db.prepare(`SELECT COUNT(*) AS n FROM products${where}`)
    .get(Object.fromEntries(Object.entries(params).filter(([key]) => !['limit', 'offset'].includes(key)))).n
  res.json({ products, count: products.length, total, limit, offset })
})

router.put('/bulk', requireAuth, (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : []
  const creates = Array.isArray(req.body?.creates) ? req.body.creates : []
  if (!updates.length && !creates.length) throw validationError('No hay cambios para guardar')
  if (updates.length + creates.length > 2000) throw validationError('El lote supera 2000 operaciones')

  const result = db.transaction(() => {
    const conflicts = []
    const preparedUpdates = updates.map((entry) => {
      const id = validateProductId(entry?.id)
      const version = Number(entry?.version)
      if (!Number.isInteger(version) || version < 1) throw validationError(`Version invalida para ${id}`)
      const patch = validateProductInput(entry?.patch, { partial: true })
      ensureCategory(patch.category_key)
      const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
      if (!current || current.version !== version) {
        conflicts.push({ id, current: current || null })
      }
      return { id, version, patch, current }
    })

    const preparedCreates = creates.map((entry) => {
      const clientId = String(entry?.clientId || '')
      const product = entry?.product || {}
      const id = validateProductId(product.id)
      const data = validateProductInput(product)
      ensureCategory(data.category_key)
      const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
      if (current) conflicts.push({ id, current })
      return { clientId, id, data }
    })

    if (conflicts.length) {
      throw validationError('Hay productos modificados por otro usuario', 409, { conflicts })
    }

    const saved = []
    for (const entry of preparedUpdates) {
      updateProductRecord(entry.id, entry.patch, { expectedVersion: entry.version })
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(entry.id)
      writeAudit({
        actor: req.user,
        action: 'update',
        entityType: 'product',
        entityId: entry.id,
        before: entry.current,
        after: product,
      })
      saved.push(product)
    }

    const created = []
    for (const entry of preparedCreates) {
      const nextSort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS next FROM products').get().next
      db.prepare(`
        INSERT INTO products (
          id, name, category_key, brand, unit, price, image_url, featured, sort, active,
          search_aliases, search_measurements, search_applications, version
        ) VALUES (
          @id, @name, @category_key, @brand, @unit, @price, @image_url,
          @featured, @sort, @active, @search_aliases, @search_measurements, @search_applications, 1
        )
      `).run({ id: entry.id, ...entry.data, sort: entry.data.sort ?? nextSort })
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(entry.id)
      writeAudit({
        actor: req.user,
        action: 'create',
        entityType: 'product',
        entityId: entry.id,
        after: product,
      })
      created.push({ clientId: entry.clientId, product })
    }

    return { products: saved, created }
  })()

  res.json(result)
})

router.put('/:id/image', requireAuth, imageBody, async (req, res, next) => {
  try {
    const id = validateProductId(req.params.id)
    const version = Number(req.query.version)
    if (!Number.isInteger(version) || version < 1) throw validationError('Version de producto invalida')
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    if (!current) throw validationError('Producto no encontrado', 404)
    if (current.version !== version) {
      throw validationError('El producto fue modificado por otro usuario', 409, { conflicts: [{ id, current }] })
    }
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw validationError('Imagen requerida')

    const metadata = await sharp(req.body).metadata()
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 25_000_000) {
      throw validationError('La imagen supera el limite de 25 megapixeles')
    }
    const output = await sharp(req.body)
      .resize(800, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    const hash = crypto.createHash('sha256').update(output).digest('hex').slice(0, 10)
    const fileName = `${id}-${hash}.webp`
    const tempName = `.${fileName}.${crypto.randomUUID()}.tmp`
    const tempPath = join(UPLOADS_DIR, tempName)
    const finalPath = join(UPLOADS_DIR, fileName)
    await mkdir(UPLOADS_DIR, { recursive: true })
    await writeFile(tempPath, output, { flag: 'wx' })
    await rename(tempPath, finalPath)

    const nextUrl = `/uploads/${fileName}`
    try {
      db.transaction(() => {
        const info = updateProductRecord(id, { image_url: nextUrl }, { expectedVersion: version })
        if (info.changes !== 1) {
          throw validationError('El producto fue modificado por otro usuario', 409)
        }
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
        writeAudit({
          actor: req.user,
          action: 'replace_image',
          entityType: 'product',
          entityId: id,
          before: { image_url: current.image_url },
          after: { image_url: product.image_url },
        })
      })()
    } catch (error) {
      await unlink(finalPath).catch(() => {})
      throw error
    }

    if (current.image_url?.startsWith('/uploads/')) {
      const previous = current.image_url.slice('/uploads/'.length)
      if (/^[a-z0-9][a-z0-9.-]*\.webp$/i.test(previous) && previous !== fileName) {
        await unlink(join(UPLOADS_DIR, previous)).catch(() => {})
      }
    }
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    res.json({ product, fileName, url: nextUrl, size: output.length })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id/image', requireAuth, (req, res) => {
  const id = validateProductId(req.params.id)
  const version = Number(req.body?.version)
  if (!Number.isInteger(version) || version < 1) throw validationError('Version de producto invalida')
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  if (!current) throw validationError('Producto no encontrado', 404)
  if (current.version !== version) {
    throw validationError('El producto fue modificado por otro usuario', 409, { conflicts: [{ id, current }] })
  }

  db.transaction(() => {
    updateProductRecord(id, { image_url: '' }, { expectedVersion: version })
    writeAudit({
      actor: req.user,
      action: 'remove_image',
      entityType: 'product',
      entityId: id,
      before: { image_url: current.image_url },
      after: { image_url: '' },
    })
  })()

  if (current.image_url?.startsWith('/uploads/')) {
    const fileName = current.image_url.slice('/uploads/'.length)
    if (/^[a-z0-9][a-z0-9.-]*\.webp$/i.test(fileName)) {
      unlink(join(UPLOADS_DIR, fileName)).catch(() => {})
    }
  }
  res.json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(id) })
})

router.get('/:id', requireAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!product) throw validationError('Producto no encontrado', 404)
  res.json({ product })
})

router.post('/', requireAuth, (req, res) => {
  const id = validateProductId(req.body?.id)
  const data = validateProductInput(req.body)
  ensureCategory(data.category_key)
  if (db.prepare('SELECT id FROM products WHERE id = ?').get(id)) {
    throw validationError('Ya existe un producto con ese id', 409)
  }
  const nextSort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS next FROM products').get().next
  db.prepare(`
    INSERT INTO products (
      id, name, category_key, brand, unit, price, image_url, featured, sort, active,
      search_aliases, search_measurements, search_applications, version
    ) VALUES (
      @id, @name, @category_key, @brand, @unit, @price, @image_url,
      @featured, @sort, @active, @search_aliases, @search_measurements, @search_applications, 1
    )
  `).run({ id, ...data, sort: data.sort ?? nextSort })
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  writeAudit({ actor: req.user, action: 'create', entityType: 'product', entityId: id, after: product })
  res.status(201).json({ product })
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw validationError('Producto no encontrado', 404)
  const source = { ...req.body }
  if (source.category !== undefined && source.category_key === undefined) {
    source.category_key = source.category
  }
  const patch = validateProductInput(source, { partial: true })
  ensureCategory(patch.category_key)
  updateProductRecord(req.params.id, patch)
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  writeAudit({
    actor: req.user,
    action: 'update',
    entityType: 'product',
    entityId: req.params.id,
    before: existing,
    after: product,
  })
  res.json({ product })
})

function setActive(req, res, active) {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw validationError('Producto no encontrado', 404)
  updateProductRecord(req.params.id, { active })
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  writeAudit({
    actor: req.user,
    action: active ? 'activate' : 'deactivate',
    entityType: 'product',
    entityId: req.params.id,
    before: existing,
    after: product,
  })
  res.json({ product })
}

router.delete('/:id', requireAuth, (req, res) => setActive(req, res, 0))
router.post('/:id/deactivate', requireAuth, (req, res) => setActive(req, res, 0))
router.post('/:id/activate', requireAuth, (req, res) => setActive(req, res, 1))

export default router
