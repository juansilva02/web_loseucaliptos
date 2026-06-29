import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort').all()
  res.json({ categories })
})

router.post('/', requireAuth, (req, res) => {
  const { key, name } = req.body
  if (!key || !name) return res.status(400).json({ error: 'key y name son requeridos' })
  const exists = db.prepare('SELECT key FROM categories WHERE key = ?').get(key)
  if (exists) return res.status(409).json({ error: 'Ya existe una categoría con esa key' })
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) + 1 AS next FROM categories').get().next
  db.prepare('INSERT INTO categories (key, name, sort) VALUES (?, ?, ?)').run(key, name, maxSort)
  const cat = db.prepare('SELECT * FROM categories WHERE key = ?').get(key)
  res.status(201).json({ category: cat })
})

router.put('/:key', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key)
  if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' })
  if (req.body.name) {
    db.prepare('UPDATE categories SET name = ? WHERE key = ?').run(req.body.name, req.params.key)
  }
  const cat = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key)
  res.json({ category: cat })
})

router.delete('/:key', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key)
  if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' })
  const productCount = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_key = ?').get(req.params.key).n
  if (productCount > 0) {
    return res.status(400).json({ error: `No se puede eliminar: ${productCount} producto(s) usan esta categoría` })
  }
  db.prepare('DELETE FROM categories WHERE key = ?').run(req.params.key)
  res.json({ message: 'Categoría eliminada' })
})

export default router
