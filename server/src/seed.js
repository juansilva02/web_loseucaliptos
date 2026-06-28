import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, initSchema } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'seed-data')

const featured = JSON.parse(readFileSync(join(dataDir, 'featured-catalog.json'), 'utf8'))
const rawSkus = JSON.parse(readFileSync(join(dataDir, 'raw-catalog.json'), 'utf8'))

initSchema()

// INSERT OR IGNORE: idempotente, no pisa ediciones hechas desde el admin.
const insCategory = db.prepare(
  'INSERT OR IGNORE INTO categories (key, name, sort) VALUES (?, ?, ?)',
)
const insProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, category_key, brand, unit, price, featured, sort)
  VALUES (@id, @name, @category_key, @brand, @unit, @price, @featured, @sort)
`)
const insRaw = db.prepare(
  'INSERT OR IGNORE INTO raw_skus (code, name, price, stock, updated_at) VALUES (?, ?, ?, ?, ?)',
)

const seedCategories = db.transaction((cats) => {
  cats.forEach((c, i) => insCategory.run(c.key, c.name, i))
})

const seedProducts = db.transaction((products) => {
  products.forEach((p, i) =>
    insProduct.run({
      id: p.id,
      name: p.name,
      category_key: p.category,
      brand: p.brand || '',
      unit: p.unit || '',
      price: p.price || 0,
      featured: 0,
      sort: i,
    }),
  )
})

const seedRaw = db.transaction((skus) => {
  skus.forEach((s) => insRaw.run(s.code, s.name, s.price || 0, s.stock ?? null, s.updatedAt || null))
})

seedCategories(featured.categories)
seedProducts(featured.products)
seedRaw(rawSkus)

const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n
console.log('[seed] categories:', count('categories'))
console.log('[seed] products  :', count('products'))
console.log('[seed] raw_skus  :', count('raw_skus'))
console.log('[seed] OK')
