const PRODUCT_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CATEGORY_KEY_RE = PRODUCT_ID_RE

function stringField(value, name, { max = 160, required = false } = {}) {
  const next = String(value ?? '').trim()
  if (required && !next) throw validationError(`${name} es requerido`)
  if (next.length > max) throw validationError(`${name} supera ${max} caracteres`)
  return next
}

function integerField(value, name, { min = 0, max = 2147483647 } = {}) {
  const next = Number(value)
  if (!Number.isInteger(next) || next < min || next > max) {
    throw validationError(`${name} debe ser un entero entre ${min} y ${max}`)
  }
  return next
}

export function validationError(message, status = 400, details) {
  const error = new Error(message)
  error.status = status
  if (details) error.details = details
  return error
}

export function validateProductId(value) {
  const id = stringField(value, 'id', { max: 120, required: true })
  if (!PRODUCT_ID_RE.test(id)) {
    throw validationError('id debe usar minusculas, numeros y guiones')
  }
  return id
}

export function validateCategoryKey(value, { allowEmpty = true } = {}) {
  const key = stringField(value, 'category_key', { max: 80 })
  if (!key && allowEmpty) return ''
  if (!CATEGORY_KEY_RE.test(key)) throw validationError('category_key invalida')
  return key
}

export function validateProductInput(input, { partial = false } = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const output = {}
  const allowed = ['name', 'category_key', 'brand', 'unit', 'price', 'image_url', 'featured', 'sort', 'active']

  for (const field of allowed) {
    if (source[field] === undefined) continue
    if (field === 'name') output.name = stringField(source.name, 'name', { max: 180, required: true })
    else if (field === 'category_key') output.category_key = validateCategoryKey(source.category_key)
    else if (field === 'brand') output.brand = stringField(source.brand, 'brand', { max: 100 })
    else if (field === 'unit') output.unit = stringField(source.unit, 'unit', { max: 60 })
    else if (field === 'image_url') output.image_url = stringField(source.image_url, 'image_url', { max: 500 })
    else if (field === 'price') output.price = integerField(source.price ?? 0, 'price')
    else if (field === 'sort') output.sort = integerField(source.sort ?? 0, 'sort')
    else output[field] = source[field] ? 1 : 0
  }

  if (!partial) {
    output.name = stringField(source.name, 'name', { max: 180, required: true })
    output.category_key = validateCategoryKey(source.category_key ?? source.category ?? '')
    output.brand ??= ''
    output.unit ??= ''
    output.price ??= 0
    output.image_url ??= ''
    output.featured ??= 0
    output.active ??= 1
  }

  if (partial && !Object.keys(output).length) throw validationError('Sin campos validos para actualizar')
  return output
}

export function parsePositiveInteger(value, fallback, { min = 1, max = 1000 } = {}) {
  if (value === undefined || value === '') return fallback
  return integerField(value, 'valor', { min, max })
}
