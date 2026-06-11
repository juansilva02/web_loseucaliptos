// Logica de datos del panel admin (sin UI).
//
// Modelo elegido: "Exportar / commit JSON". El panel edita una copia de trabajo
// (borrador) guardada en localStorage. Cuando el admin termina, exporta:
//   1) un featured-catalog.json actualizado  -> reemplaza src/data/featured-catalog.json
//   2) las imagenes nuevas                    -> se guardan en public/product-images/
// Luego se commitea y Vercel redeploya: los cambios pasan a verlos los clientes.

import baseCatalog from '../data/featured-catalog.json'
import { DRAFT_KEY, IMAGES_DIR } from './adminConfig'

export function deepClone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value))
}

// Copia limpia del catalogo publicado (lo que hoy esta en el repo).
export function loadBaseCatalog() {
  return deepClone(baseCatalog)
}

// --- Borrador en el navegador (sobrevive recargas) ---

export function loadDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveDraft(draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    // Probablemente se supero la cuota de localStorage (imagenes grandes en base64).
    // El borrador de datos se intenta igual sin las imagenes pesadas.
    try {
      const slim = { ...draft, pendingImages: {} }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(slim))
    } catch {
      /* sin almacenamiento disponible */
    }
    return false
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* sin almacenamiento disponible */
  }
}

// Estructura del borrador: { catalog, pendingImages }
//  - catalog: el featured-catalog.json en edicion
//  - pendingImages: { "<archivo>": "data:image/...;base64,..." } imagenes a descargar
export function createDraft() {
  return { catalog: loadBaseCatalog(), pendingImages: {} }
}

// --- Utilidades de productos ---

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Genera un id unico para un producto nuevo a partir del nombre.
export function makeProductId(name, existingIds) {
  const base = slugify(name) || 'producto'
  let id = base
  let n = 2
  while (existingIds.has(id)) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

export function extensionFromDataUrl(dataUrl) {
  const match = /^data:image\/([a-z0-9.+-]+);/i.exec(dataUrl || '')
  const raw = (match?.[1] || 'png').toLowerCase()
  if (raw === 'jpeg') return 'jpg'
  if (raw === 'svg+xml') return 'svg'
  return raw
}

// Ruta publica de la imagen (la que se guarda en el JSON y lee el storefront).
export function imagePath(fileName) {
  return `${IMAGES_DIR}/${fileName}`
}

// --- Exportacion ---

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] || 'application/octet-stream'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// Limpia campos transitorios (vista previa) antes de exportar el JSON.
function cleanCatalogForExport(catalog) {
  const clone = deepClone(catalog)
  clone.updatedAt = new Date().toISOString().slice(0, 10)
  const strip = (item) => {
    delete item._preview // dataURL de vista previa, no va al repo
  }
  clone.featured?.forEach(strip)
  clone.products?.forEach(strip)
  return clone
}

export function exportCatalogJson(catalog) {
  const clean = cleanCatalogForExport(catalog)
  const json = JSON.stringify(clean, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), 'featured-catalog.json')
  return clean
}

export function exportImages(pendingImages) {
  const names = Object.keys(pendingImages || {})
  names.forEach((fileName, i) => {
    // Pequeño escalonado para que el navegador no bloquee descargas multiples.
    setTimeout(() => downloadBlob(dataUrlToBlob(pendingImages[fileName]), fileName), i * 350)
  })
  return names
}
