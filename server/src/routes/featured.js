import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (_req, res) => {
  const items = db.prepare(`
    SELECT
      p.id,
      p.name AS excelName,
      p.id AS code,
      p.price,
      p.brand AS brandName,
      p.unit,
      p.category_key AS categoryKey,
      COALESCE(c.name, p.category_key, 'Materiales') AS categoryName,
      p.image_url AS image
    FROM products p
    LEFT JOIN categories c ON c.key = p.category_key
    WHERE p.active = 1 AND p.featured = 1
    ORDER BY p.sort, p.name
  `).all()

  res.json({ featured: items, count: items.length })
})

export default router
