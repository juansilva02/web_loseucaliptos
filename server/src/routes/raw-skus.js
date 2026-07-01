import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

const RUBRO_CATEGORY_MAP = {
  ARIDOS: 'aridos-y-obra-gruesa',
  HIERRO: 'hierros-y-estructura',
  MALLA: 'hierros-y-estructura',
  VIGA: 'hierros-y-estructura',
  LADRILLOS: 'ladrillos-y-bloques',
  BLOQUES: 'ladrillos-y-bloques',
  CERAMICAS: 'construccion-en-seco',
  TERMINACIÓN: 'construccion-en-seco',
  WEBER: 'construccion-en-seco',
  PLOMERIA: 'sanitarios-y-plomeria',
  SANITARIOS: 'sanitarios-y-plomeria',
  PVC: 'sanitarios-y-plomeria',
  POLIPROPILENO: 'sanitarios-y-plomeria',
  ELECTRICIDAD: 'electricidad-y-ferreteria',
  FERRETERIA: 'electricidad-y-ferreteria',
  ABERTURA: 'electricidad-y-ferreteria',
}

function inferCategoryKeyFromRubro(rubro) {
  return RUBRO_CATEGORY_MAP[String(rubro || '').trim().toUpperCase()] || 'otros-materiales'
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function getQualityFlags(name) {
  const value = String(name || '')
  const flags = []
  if (/\bNO+\s*HAY+\b/i.test(value) || /\bSIN\s+STOCK\b/i.test(value)) flags.push('unavailable')
  if (/\bPROMO\b/i.test(value) || /\bOFERTA\b/i.test(value)) flags.push('promo')
  if (/\s{2,}/.test(value) || /-{2,}/.test(value)) flags.push('format')
  return flags
}

router.get('/', requireAuth, (req, res) => {
  const search = req.query.q || ''
  const added = req.query.added
  let sql = 'SELECT * FROM raw_skus WHERE 1=1'
  const params = {}
  if (added === '0') sql += ' AND added = 0'
  else if (added === '1') sql += ' AND added = 1'
  if (search) {
    sql += ' AND (name LIKE @search OR CAST(code AS TEXT) LIKE @code OR rubro LIKE @rubro)'
    params.search = `%${search}%`
    params.code = `%${search}%`
    params.rubro = `%${search}%`
  }
  sql += ' ORDER BY code LIMIT 200'
  const skus = db.prepare(sql).all(params).map((sku) => ({
    ...sku,
    suggested_category_key: inferCategoryKeyFromRubro(sku.rubro),
    quality_flags: getQualityFlags(sku.name),
  }))
  res.json({ skus, count: skus.length })
})

router.post('/:code/promote', requireAuth, (req, res) => {
  const raw = db.prepare('SELECT * FROM raw_skus WHERE code = ?').get(Number(req.params.code))
  if (!raw) return res.status(404).json({ error: 'SKU no encontrado' })
  if (raw.added) return res.status(409).json({ error: 'Este SKU ya fue promovido al catálogo' })

  const id = slugify(req.body.id) || slugify(raw.name) || `sku-${raw.code}`
  const category = req.body.category_key || inferCategoryKeyFromRubro(raw.rubro)

  const result = db.transaction(() => {
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) + 1 AS next FROM products').get().next
    const info = db.prepare(`
      INSERT OR IGNORE INTO products (id, name, category_key, brand, unit, price, source_code, sort, active, featured)
      VALUES (@id, @name, @category, '', '', @price, @code, @sort, 0, 0)
    `).run({ id, name: raw.name, category, price: raw.price || 0, code: raw.code, sort: maxSort })
    // Colision de id (producto ya existente): no marcamos added, avisamos.
    if (info.changes === 0) return { conflict: true }
    db.prepare('UPDATE raw_skus SET added = 1 WHERE code = ?').run(raw.code)
    return { conflict: false }
  })()

  if (result.conflict) {
    return res.status(409).json({ error: `Ya existe un producto con id "${id}". Asigna un id distinto o renombra el SKU.` })
  }

  const product = db.prepare('SELECT * FROM products WHERE source_code = ?').get(raw.code)
  res.status(201).json({ product })
})

export default router
