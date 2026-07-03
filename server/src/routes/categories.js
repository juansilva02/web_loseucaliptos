import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { writeAudit } from '../audit.js'
import { validateCategoryKey, validationError } from '../validation.js'

const router = Router()

function categoryName(value) {
  const name = String(value || '').trim()
  if (!name || name.length > 100) throw validationError('Nombre de categoria invalido')
  return name
}

router.get('/', requireAuth, (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort').all()
  res.json({ categories })
})

router.put('/bulk', requireAuth, (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : []
  if (!updates.length || updates.length > 50) throw validationError('Lote de categorias invalido')

  const categories = db.transaction(() => {
    const prepared = updates.map((entry) => {
      const key = validateCategoryKey(entry?.key, { allowEmpty: false })
      const version = Number(entry?.version)
      if (!Number.isInteger(version) || version < 1) throw validationError(`Version invalida para ${key}`)
      const current = db.prepare('SELECT * FROM categories WHERE key = ?').get(key)
      if (!current || current.version !== version) {
        throw validationError('Hay categorias modificadas por otro usuario', 409, {
          conflicts: [{ key, current: current || null }],
        })
      }
      return { key, version, name: categoryName(entry?.name), current }
    })

    return prepared.map((entry) => {
      db.prepare(`
        UPDATE categories SET name = ?, version = version + 1
        WHERE key = ? AND version = ?
      `).run(entry.name, entry.key, entry.version)
      const updated = db.prepare('SELECT * FROM categories WHERE key = ?').get(entry.key)
      writeAudit({
        actor: req.user,
        action: 'update',
        entityType: 'category',
        entityId: entry.key,
        before: entry.current,
        after: updated,
      })
      return updated
    })
  })()

  res.json({ categories })
})

router.post('/', requireAuth, (req, res) => {
  const key = validateCategoryKey(req.body?.key, { allowEmpty: false })
  const name = categoryName(req.body?.name)
  if (db.prepare('SELECT key FROM categories WHERE key = ?').get(key)) {
    throw validationError('Ya existe una categoria con esa key', 409)
  }
  const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS next FROM categories').get().next
  db.prepare('INSERT INTO categories (key, name, sort, version) VALUES (?, ?, ?, 1)')
    .run(key, name, sort)
  const category = db.prepare('SELECT * FROM categories WHERE key = ?').get(key)
  writeAudit({
    actor: req.user,
    action: 'create',
    entityType: 'category',
    entityId: key,
    after: category,
  })
  res.status(201).json({ category })
})

router.put('/:key', requireAuth, (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key)
  if (!current) throw validationError('Categoria no encontrada', 404)
  const name = categoryName(req.body?.name)
  db.prepare('UPDATE categories SET name = ?, version = version + 1 WHERE key = ?')
    .run(name, req.params.key)
  const category = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key)
  writeAudit({
    actor: req.user,
    action: 'update',
    entityType: 'category',
    entityId: req.params.key,
    before: current,
    after: category,
  })
  res.json({ category })
})

router.delete('/:key', requireAuth, (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key)
  if (!current) throw validationError('Categoria no encontrada', 404)
  const productCount = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_key = ?')
    .get(req.params.key).n
  if (productCount > 0) {
    throw validationError(`No se puede eliminar: ${productCount} producto(s) usan esta categoria`)
  }
  db.transaction(() => {
    writeAudit({
      actor: req.user,
      action: 'delete',
      entityType: 'category',
      entityId: req.params.key,
      before: current,
    })
    db.prepare('DELETE FROM categories WHERE key = ?').run(req.params.key)
  })()
  res.json({ success: true })
})

export default router
