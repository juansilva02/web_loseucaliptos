import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', (_req, res) => {
  const items = db.prepare('SELECT * FROM featured WHERE active = 1 ORDER BY sort').all()
  res.json({ featured: items, count: items.length })
})

router.get('/all', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM featured ORDER BY sort').all()
  res.json({ featured: items, count: items.length })
})

router.post('/', requireAuth, (req, res) => {
  const { id, title, subtitle, match, category_key, price_override, image_url } = req.body
  if (!title) return res.status(400).json({ error: 'title es requerido' })
  const itemId = id || `featured-${Date.now()}`
  const exists = db.prepare('SELECT id FROM featured WHERE id = ?').get(itemId)
  if (exists) return res.status(409).json({ error: 'Ya existe un destacado con ese id' })
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) + 1 AS next FROM featured').get().next
  db.prepare(`
    INSERT INTO featured (id, title, subtitle, match, category_key, price_override, image_url, sort, active)
    VALUES (@id, @title, @subtitle, @match, @category_key, @price_override, @image_url, @sort, 1)
  `).run({
    id: itemId, title,
    subtitle: subtitle || '',
    match: match || '',
    category_key: category_key || '',
    price_override: price_override ?? null,
    image_url: image_url || '',
    sort: maxSort,
  })
  const item = db.prepare('SELECT * FROM featured WHERE id = ?').get(itemId)
  res.status(201).json({ featured: item })
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM featured WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Destacado no encontrado' })
  const fields = ['title', 'subtitle', 'match', 'category_key', 'price_override', 'image_url', 'sort', 'active']
  const sets = []
  const params = { id: req.params.id }
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = @${f}`)
      params[f] = req.body[f]
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' })
  sets.push("updated_at = datetime('now')")
  db.prepare(`UPDATE featured SET ${sets.join(', ')} WHERE id = @id`).run(params)
  const item = db.prepare('SELECT * FROM featured WHERE id = ?').get(req.params.id)
  res.json({ featured: item })
})

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM featured WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Destacado no encontrado' })
  db.prepare("UPDATE featured SET active = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id)
  res.json({ message: 'Destacado desactivado' })
})

export default router
