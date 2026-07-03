import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { writeAudit } from '../audit.js'
import { normalizeCatalogText } from '../catalog-quality.js'
import { parsePositiveInteger, validateProductId, validationError } from '../validation.js'

const router = Router()

const RUBRO_CATEGORY_MAP = {
  ARIDOS: 'aridos-y-obra-gruesa',
  ARIDO: 'aridos-y-obra-gruesa',
  CEMENTO: 'aridos-y-obra-gruesa',
  BOLSA: 'aridos-y-obra-gruesa',
  BOLSAS: 'aridos-y-obra-gruesa',
  BOLSON: 'aridos-y-obra-gruesa',
  PALLET: 'aridos-y-obra-gruesa',
  LIGANTE: 'aridos-y-obra-gruesa',
  'ALBAÑILERIA': 'aridos-y-obra-gruesa',
  HORNERO: 'aridos-y-obra-gruesa',
  HIERRO: 'hierros-y-estructura',
  ACERO: 'hierros-y-estructura',
  MALLA: 'hierros-y-estructura',
  VIGA: 'hierros-y-estructura',
  ALAMBRE: 'hierros-y-estructura',
  LADRILLOS: 'ladrillos-y-bloques',
  LADRILLO: 'ladrillos-y-bloques',
  BLOQUES: 'ladrillos-y-bloques',
  PORCELANATO: 'ladrillos-y-bloques',
  CERAMICAS: 'construccion-en-seco',
  CERAMICA: 'construccion-en-seco',
  TERMINACION: 'construccion-en-seco',
  WEBER: 'construccion-en-seco',
  AISLANTE: 'construccion-en-seco',
  MEMBRANA: 'construccion-en-seco',
  'FIBRA DE VIDRIO': 'construccion-en-seco',
  FILM: 'construccion-en-seco',
  HIDROFUGOS: 'construccion-en-seco',
  PASTA: 'construccion-en-seco',
  PASTINA: 'construccion-en-seco',
  PEGAMENTOS: 'construccion-en-seco',
  PREMECOL: 'construccion-en-seco',
  SECO: 'construccion-en-seco',
  TERGOPOL: 'construccion-en-seco',
  PLOMERIA: 'sanitarios-y-plomeria',
  SANITARIOS: 'sanitarios-y-plomeria',
  PVC: 'sanitarios-y-plomeria',
  POLIPROPILENO: 'sanitarios-y-plomeria',
  'CAÑOS': 'sanitarios-y-plomeria',
  ACOPLE: 'sanitarios-y-plomeria',
  ADAPTADOR: 'sanitarios-y-plomeria',
  AIREADOR: 'sanitarios-y-plomeria',
  PILETA: 'sanitarios-y-plomeria',
  PILETAS: 'sanitarios-y-plomeria',
  ELECTRICIDAD: 'ferreteria-y-herramientas',
  FERRETERIA: 'ferreteria-y-herramientas',
  ABERTURA: 'ferreteria-y-herramientas',
  ABERTURAS: 'ferreteria-y-herramientas',
  CLAVOS: 'ferreteria-y-herramientas',
  CORREA: 'ferreteria-y-herramientas',
  'DISCO DE CORTE': 'ferreteria-y-herramientas',
  HOGAR: 'ferreteria-y-herramientas',
  MADERA: 'ferreteria-y-herramientas',
  MEDIASOMBRA: 'ferreteria-y-herramientas',
  PINTURA: 'ferreteria-y-herramientas',
  SILICONA: 'ferreteria-y-herramientas',
  VIDRIO: 'ferreteria-y-herramientas',
}

function inferCategoryKeyFromRubro(rubro) {
  return RUBRO_CATEGORY_MAP[normalizeCatalogText(rubro)] || 'otros-materiales'
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeLike(value) {
  return String(value || '').replace(/[\\%_]/g, '\\$&')
}

function getQualityFlags(name) {
  const value = String(name || '')
  const flags = []
  if (/\bNO+\s*HAY+\b/i.test(value) || /\bSIN\s+STOCK\b/i.test(value)) flags.push('unavailable')
  if (/\bPROMO\b/i.test(value) || /\bOFERTA\b/i.test(value)) flags.push('promo')
  if (/\s{2,}/.test(value) || /-{2,}/.test(value)) flags.push('format')
  return flags
}

function candidateProducts(rawName, products) {
  const normalized = normalizeCatalogText(rawName)
  if (!normalized) return []
  const rawTokens = new Set(normalized.split(' ').filter((token) => token.length > 2))

  return products
    .map((product) => {
      const productName = normalizeCatalogText(product.name)
      const productTokens = new Set(productName.split(' ').filter((token) => token.length > 2))
      let shared = 0
      for (const token of rawTokens) if (productTokens.has(token)) shared += 1
      const score = normalized === productName
        ? 100
        : Math.round((shared / Math.max(rawTokens.size, productTokens.size, 1)) * 100)
      return { id: product.id, name: product.name, source_code: product.source_code, score }
    })
    .filter((candidate) => candidate.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

router.get('/', requireAuth, (req, res) => {
  const search = String(req.query.q || '').trim()
  const added = String(req.query.added ?? '')
  const limit = parsePositiveInteger(req.query.limit, 200, { max: 200 })
  const offset = parsePositiveInteger(req.query.offset, 0, { min: 0, max: 100000 })
  let where = ' WHERE 1=1'
  const params = { limit, offset }

  if (added === '0') where += ' AND added = 0'
  else if (added === '1') where += ' AND added = 1'
  if (search) {
    where += `
      AND (
        name LIKE @search ESCAPE '\\'
        OR CAST(code AS TEXT) LIKE @search ESCAPE '\\'
        OR rubro LIKE @search ESCAPE '\\'
      )
    `
    params.search = `%${escapeLike(search)}%`
  }

  const skus = db.prepare(
    `SELECT * FROM raw_skus${where} ORDER BY code LIMIT @limit OFFSET @offset`,
  ).all(params)
  const countParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => !['limit', 'offset'].includes(key)),
  )
  const total = db.prepare(`SELECT COUNT(*) AS n FROM raw_skus${where}`).get(countParams).n
  const products = req.query.candidates === '1'
    ? db.prepare('SELECT id, name, source_code FROM products ORDER BY name').all()
    : []

  res.json({
    skus: skus.map((sku) => ({
      ...sku,
      suggested_category_key: inferCategoryKeyFromRubro(sku.rubro),
      quality_flags: getQualityFlags(sku.name),
      candidates: products.length ? candidateProducts(sku.name, products) : [],
    })),
    count: skus.length,
    total,
    limit,
    offset,
  })
})

router.post('/:code/link', requireAuth, (req, res) => {
  const code = Number(req.params.code)
  const productId = validateProductId(req.body?.productId)
  if (!Number.isInteger(code) || code < 1) throw validationError('Codigo de SKU invalido')

  const result = db.transaction(() => {
    const raw = db.prepare('SELECT * FROM raw_skus WHERE code = ?').get(code)
    if (!raw) throw validationError('SKU no encontrado', 404)
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
    if (!product) throw validationError('Producto no encontrado', 404)
    const existingLink = db.prepare('SELECT id FROM products WHERE source_code = ? AND id != ?')
      .get(code, productId)
    if (existingLink) throw validationError(`El SKU ya esta vinculado a ${existingLink.id}`, 409)
    if (product.source_code && product.source_code !== code) {
      throw validationError(`El producto ya esta vinculado al SKU ${product.source_code}`, 409)
    }

    db.prepare(`
      UPDATE products
      SET source_code = ?, version = version + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(code, productId)
    db.prepare('UPDATE raw_skus SET added = 1 WHERE code = ?').run(code)
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
    writeAudit({
      actor: req.user,
      action: 'link_raw_sku',
      entityType: 'product',
      entityId: productId,
      before: { source_code: product.source_code },
      after: { source_code: code },
    })
    return { product: updated, sku: { ...raw, added: 1 } }
  })()

  res.json(result)
})

router.post('/:code/promote', requireAuth, (req, res) => {
  const code = Number(req.params.code)
  if (!Number.isInteger(code) || code < 1) throw validationError('Codigo de SKU invalido')
  const raw = db.prepare('SELECT * FROM raw_skus WHERE code = ?').get(code)
  if (!raw) throw validationError('SKU no encontrado', 404)
  if (raw.added) throw validationError('Este SKU ya fue promovido o vinculado', 409)

  const exact = db.prepare('SELECT id, name FROM products').all()
    .find((product) => normalizeCatalogText(product.name) === normalizeCatalogText(raw.name))
  if (exact) {
    throw validationError(
      `Ya existe el producto "${exact.name}". Vincula el SKU en vez de promoverlo.`,
      409,
      { candidate: exact },
    )
  }

  const id = validateProductId(req.body?.id || slugify(raw.name) || `sku-${raw.code}`)
  const category = String(req.body?.category_key || inferCategoryKeyFromRubro(raw.rubro))
  if (!db.prepare('SELECT key FROM categories WHERE key = ?').get(category)) {
    throw validationError(`La categoria "${category}" no existe`)
  }

  const product = db.transaction(() => {
    if (db.prepare('SELECT id FROM products WHERE id = ?').get(id)) {
      throw validationError(`Ya existe un producto con id "${id}"`, 409)
    }
    if (db.prepare('SELECT id FROM products WHERE source_code = ?').get(code)) {
      throw validationError('El SKU ya esta vinculado a otro producto', 409)
    }
    const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS next FROM products').get().next
    db.prepare(`
      INSERT INTO products (
        id, name, category_key, brand, unit, price, source_code, sort, active, featured, version
      ) VALUES (?, ?, ?, '', '', ?, ?, ?, 0, 0, 1)
    `).run(id, raw.name, category, raw.price || 0, code, sort)
    db.prepare('UPDATE raw_skus SET added = 1 WHERE code = ?').run(code)
    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    writeAudit({
      actor: req.user,
      action: 'promote_raw_sku',
      entityType: 'product',
      entityId: id,
      after: created,
    })
    return created
  })()

  res.status(201).json({ product })
})

export default router
