import { Router } from 'express'
import { db } from '../db.js'
import { getCatalogCache } from '../catalog-cache.js'
import { isUnavailableName } from '../catalog-quality.js'
import { validationError } from '../validation.js'

const router = Router()

// Preparacion perezosa: al importar el modulo el esquema todavia no existe.
let statements = null
function stmts() {
  statements ??= {
    categories: db.prepare('SELECT key, name FROM categories ORDER BY sort'),
    publicProducts: db.prepare(`
      SELECT id, name, category_key AS category, brand, unit, price,
             image_url AS image, featured, version
      FROM products
      WHERE active = 1
      ORDER BY products.sort, products.name
    `),
    quoteProduct: db.prepare(`
      SELECT id, name, category_key, brand, unit, price, image_url, featured, active, version
      FROM products WHERE id = ?
    `),
    searchableProducts: db.prepare(`
      SELECT products.id, products.name, products.category_key AS category,
             categories.name AS category_name, products.brand, products.unit, products.price,
             products.search_aliases, products.search_measurements, products.search_applications,
             products.version
      FROM products
      LEFT JOIN categories ON categories.key = products.category_key
      WHERE active = 1
      ORDER BY products.sort, products.name
    `),
  }
  return statements
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const SEARCH_STOP_WORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'para', 'por', 'que', 'una', 'un', 'y',
])

function jsonList(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function tokenize(value) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean)
}

function searchProducts(query) {
  const normalizedQuery = normalizeSearchText(query)
  const terms = normalizedQuery
    .split(/\s+/)
    .filter((term) => term.length >= 1 && !SEARCH_STOP_WORDS.has(term))

  if (!terms.length) return []

  return stmts().searchableProducts.all()
    .map((product) => {
      const fields = {
        nombre: tokenize(product.name),
        marca: tokenize(product.brand),
        categoria: tokenize(`${product.category} ${product.category_name}`),
        alias: jsonList(product.search_aliases).flatMap(tokenize),
        medida: jsonList(product.search_measurements).flatMap(tokenize),
        aplicacion: jsonList(product.search_applications).flatMap(tokenize),
      }
      const fieldWeights = {
        nombre: 40,
        marca: 18,
        categoria: 15,
        alias: 35,
        medida: 32,
        aplicacion: 35,
      }
      const matches = terms.map((term) => {
        const matchingFields = Object.entries(fields)
          .filter(([, values]) => values.some((value) => value === term || (term.length >= 3 && value.includes(term))))
          .map(([field]) => field)
        return { term, fields: matchingFields }
      })
      if (matches.some((match) => !match.fields.length)) return null

      const exactName = normalizeSearchText(product.name) === normalizedQuery
      const exactPhrase = Object.values(fields).some((values) => values.join(' ').includes(normalizedQuery))
      const averageWeight = matches.reduce((total, match) => (
        total + Math.max(...match.fields.map((field) => fieldWeights[field]))
      ), 0) / matches.length
      const metadataMatch = matches.some((match) => match.fields.some((field) => (
        ['alias', 'medida', 'aplicacion'].includes(field)
      )))
      const score = Math.min(100, Math.round(
        (averageWeight / 40) * 70 + (exactPhrase ? 20 : 0) + (metadataMatch ? 10 : 0),
      ))
      const matchReason = matches.map((match) => `${match.term}: ${match.fields.join(', ')}`)
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        unit: product.unit,
        price: product.price,
        version: product.version,
        score: exactName ? 100 : score,
        matchedTerms: matches.map((match) => match.term),
        matchReason,
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'es'))
    .slice(0, 20)
}

function publicCatalog() {
  const categories = stmts().categories.all()
  const products = stmts().publicProducts.all()
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
    const seenPrice = item?.seenPrice == null || item.seenPrice === ''
      ? null
      : Number(item.seenPrice)
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw validationError('Producto o cantidad invalida en el carrito')
    }
    return { id, quantity, seenPrice: Number.isFinite(seenPrice) ? seenPrice : null }
  })

  const items = []
  const changes = []
  const blocked = []

  for (const requested of normalized) {
    const product = stmts().quoteProduct.get(requested.id)
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
  const status = blocked.length && !items.length
    ? 'unavailable'
    : blocked.length
      ? 'partial'
      : 'quoted'

  res.json({ status, items, subtotal, changes, blocked })
})

router.get('/search', (req, res) => {
  const query = String(req.query.q ?? '').trim()
  if (query.length < 3) {
    throw validationError('La busqueda debe contener al menos 3 caracteres')
  }
  if (query.length > 160) {
    throw validationError('La busqueda supera 160 caracteres')
  }

  const results = searchProducts(query)
  res.json({
    query,
    results,
    count: results.length,
    ambiguous: results.length > 1,
  })
})

router.get('/', (req, res) => {
  const { body, etag } = getCatalogCache(publicCatalog)
  res.set('Cache-Control', 'no-cache')
  res.set('ETag', etag)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end()
    return
  }
  res.type('application/json').send(body)
})

export default router
