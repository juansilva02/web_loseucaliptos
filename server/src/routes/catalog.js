import { Router } from 'express'
import { db } from '../db.js'
import { isUnavailableName } from '../catalog-quality.js'
import { validationError } from '../validation.js'

const router = Router()

function publicCatalog() {
  const categories = db.prepare('SELECT key, name FROM categories ORDER BY sort').all()
  const products = db.prepare(`
    SELECT id, name, category_key AS category, brand, unit, price,
           image_url AS image, featured, version
    FROM products
    WHERE active = 1
    ORDER BY sort, name
  `).all()
  return { categories, products, count: products.length }
}

router.post('/quote', (req, res) => {
  const input = Array.isArray(req.body?.items) ? req.body.items : []
  if (!input.length || input.length > 100) {
    throw validationError('El carrito debe contener entre 1 y 100 productos')
  }

  const normalized = input.map((item) => {
    const id = String(item?.id || '').trim()
    const quantity = Number(item?.quantity)
    const seenPrice = Number(item?.seenPrice)
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw validationError('Producto o cantidad invalida en el carrito')
    }
    return { id, quantity, seenPrice: Number.isFinite(seenPrice) ? seenPrice : null }
  })

  const getProduct = db.prepare(`
    SELECT id, name, category_key, brand, unit, price, image_url, featured, active, version
    FROM products WHERE id = ?
  `)
  const items = []
  const changes = []
  const blocked = []

  for (const requested of normalized) {
    const product = getProduct.get(requested.id)
    if (!product || product.active !== 1) {
      blocked.push({ id: requested.id, reason: 'inactive_or_missing' })
      continue
    }
    if (product.price <= 0 || isUnavailableName(product.name)) {
      blocked.push({ id: product.id, name: product.name, reason: 'not_purchasable' })
      continue
    }
    if (requested.seenPrice != null && requested.seenPrice !== product.price) {
      changes.push({
        id: product.id,
        name: product.name,
        previousPrice: requested.seenPrice,
        currentPrice: product.price,
      })
    }
    items.push({
      id: product.id,
      code: product.id,
      name: product.name,
      excelName: product.name,
      categoryName: product.category_key,
      brandName: product.brand,
      unit: product.unit,
      price: product.price,
      quantity: requested.quantity,
      version: product.version,
    })
  }

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)
  res.json({ items, subtotal, changes, blocked })
})

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.json(publicCatalog())
})

export default router
