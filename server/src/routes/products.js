import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const search = req.query.q || ''
  const category = req.query.category || ''
  const includeInactive = req.query.all === '1'
  let sql = 'SELECT * FROM products WHERE 1=1'
  const params = {}
  if (!includeInactive) { sql += ' AND active = 1'; params.active = 1 }
  if (category) { sql += ' AND category_key = @category'; params.category = category }
  if (search) { sql += ' AND (name LIKE @search OR brand LIKE @search2)'; const esc = search.replace(/[%_]/g, '\\$&'); params.search = `%${esc}%`; params.search2 = `%${esc}%` }
  sql += ' ORDER BY sort'
  const products = db.prepare(sql).all(params)
  res.json({ products, count: products.length })
})

router.get('/:id', requireAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
  res.json({ product })
})

router.post('/', requireAuth, (req, res) => {
  const { id, name, category, category_key, brand, unit, price, image_url, featured, active } = req.body
  if (!id || !name) return res.status(400).json({ error: 'id y name son requeridos' })
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(id)
  if (exists) return res.status(409).json({ error: 'Ya existe un producto con ese id' })
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) + 1 AS next FROM products').get().next
  const nextCategoryKey = category_key || category || ''
  db.prepare(`
    INSERT INTO products (id, name, category_key, brand, unit, price, image_url, featured, sort, active)
    VALUES (@id, @name, @category, @brand, @unit, @price, @image, @featured, @sort, @active)
  `).run({
    id, name,
    category: nextCategoryKey,
    brand: brand || '',
    unit: unit || '',
    price: price ?? 0,
    image: image_url || '',
    featured: featured ? 1 : 0,
    sort: maxSort,
    active: active !== undefined ? (active ? 1 : 0) : 1,
  })
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  res.status(201).json({ product })
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })
  if (req.body.category !== undefined && req.body.category_key === undefined) {
    req.body.category_key = req.body.category
  }
  const fields = ['name', 'category_key', 'brand', 'unit', 'price', 'image_url', 'featured', 'sort', 'active']
  const sets = []
  const params = { id: req.params.id }
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = @${f}`)
      let val = req.body[f]
      if (f === 'featured' || f === 'active') val = val ? 1 : 0
      params[f] = val
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' })
  sets.push("updated_at = datetime('now')")
  db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = @id`).run(params)
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  res.json({ product })
})

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })
  db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json({ message: 'Producto desactivado' })
})

router.post('/:id/deactivate', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })
  db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json({ message: 'Producto desactivado' })
})

router.post('/:id/activate', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })
  db.prepare("UPDATE products SET active = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json({ message: 'Producto activado' })
})

export default router
