import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, initSchema } from './db.js'
import { hashPassword } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'seed-data')

const featured = JSON.parse(readFileSync(join(dataDir, 'featured-catalog.json'), 'utf8'))
const rawSkus = JSON.parse(readFileSync(join(dataDir, 'raw-catalog.json'), 'utf8'))
const featuredProductIds = new Set(
  JSON.parse(readFileSync(join(dataDir, 'featured-product-ids.json'), 'utf8')),
)

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
  'INSERT OR IGNORE INTO raw_skus (code, name, rubro, price, cost, stock, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
)
const seedCategories = db.transaction((cats) => {
  const allCategories = [...cats]
  if (!allCategories.some((category) => category.key === 'otros-materiales')) {
    allCategories.push({ key: 'otros-materiales', name: 'Otros Materiales' })
  }
  allCategories.forEach((category, index) => insCategory.run(category.key, category.name, index))
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
      featured: featuredProductIds.has(p.id) ? 1 : 0,
      sort: i,
    }),
  )
})

const seedRaw = db.transaction((skus) => {
  skus.forEach((s) => insRaw.run(s.code, s.name, s.rubro || '', s.price || 0, s.cost ?? null, s.stock ?? null, s.updatedAt || null))
})

seedCategories(featured.categories)
seedProducts(featured.products)
seedRaw(rawSkus)

// Admin user por defecto: solo si no existe ningun usuario.
const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get()
if (!existingUser) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  if (!process.env.SEED_ADMIN_EMAIL && process.env.ADMIN_EMAIL) {
    console.warn('[seed] ADMIN_EMAIL es legacy; renombrar a SEED_ADMIN_EMAIL')
  }
  if (!process.env.SEED_ADMIN_PASSWORD && process.env.ADMIN_PASSWORD) {
    console.warn('[seed] ADMIN_PASSWORD es legacy; renombrar a SEED_ADMIN_PASSWORD')
  }
  if (!adminPassword) {
    console.warn('[seed] SEED_ADMIN_PASSWORD no configurado, saltando creacion de admin user')
  } else {
    const hash = await hashPassword(adminPassword)
    db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')").run(adminEmail, hash)
    console.log(`[seed] admin user created: ${adminEmail}`)
  }
} else {
  console.log('[seed] admin user already exists, skipping')
}

const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n
console.log('[seed] categories:', count('categories'))
console.log('[seed] products  :', count('products'))
console.log('[seed] raw_skus  :', count('raw_skus'))
console.log('[seed] users     :', count('users'))
console.log('[seed] OK')
