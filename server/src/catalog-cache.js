import crypto from 'node:crypto'

// Cache en memoria del catalogo publico serializado. El proceso Node es el
// unico escritor de la base, asi que invalidar en cada mutacion admin alcanza.
let cached = null

export function invalidateCatalogCache() {
  cached = null
}

export function getCatalogCache(build) {
  if (!cached) {
    const body = JSON.stringify(build())
    const etag = `"${crypto.createHash('sha1').update(body).digest('hex')}"`
    cached = { body, etag }
  }
  return cached
}

// Invalida la cache cuando una request de escritura admin termina bien.
export function invalidateCatalogOnWrite(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    res.on('finish', () => {
      if (res.statusCode < 400) invalidateCatalogCache()
    })
  }
  next()
}
