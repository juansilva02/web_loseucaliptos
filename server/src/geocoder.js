const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const CACHE_TTL_MS = 60 * 60 * 1000
const REQUEST_GAP_MS = 1100
const MAX_CACHE_ENTRIES = 500
const MAX_PENDING_REQUESTS = 20

const cache = new Map()
let queue = Promise.resolve()
let lastRequestAt = 0
let pendingRequests = 0

function cacheKey(path, params) {
  return `${path}?${new URLSearchParams(params).toString()}`
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value
}

function setCached(key, value) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value)
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

function scheduleRequest(task) {
  if (pendingRequests >= MAX_PENDING_REQUESTS) {
    const error = new Error('El servicio de ubicacion esta ocupado. Intenta nuevamente.')
    error.status = 503
    throw error
  }
  pendingRequests += 1
  const run = queue.then(async () => {
    const waitMs = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt))
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs))
    lastRequestAt = Date.now()
    return task()
  })
  queue = run.catch(() => {})
  return run.finally(() => {
    pendingRequests -= 1
  })
}

async function nominatim(path, params) {
  const key = cacheKey(path, params)
  const cached = getCached(key)
  if (cached) return cached

  return scheduleRequest(async () => {
    const secondCached = getCached(key)
    if (secondCached) return secondCached

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    try {
      const query = new URLSearchParams(params)
      const email = String(process.env.GEOCODER_EMAIL || '').trim()
      if (email) query.set('email', email)
      const response = await fetch(`${NOMINATIM_BASE}${path}?${query}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es-AR,es;q=0.9',
          'User-Agent': process.env.GEOCODER_USER_AGENT ||
            'LosEucaliptosCorralon/1.0 (https://corralonloseucaliptus.com)',
        },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Geocoder HTTP ${response.status}`)
      const value = await response.json()
      setCached(key, value)
      return value
    } finally {
      clearTimeout(timeout)
    }
  })
}

export async function searchPlaces(query, limit = 5) {
  return nominatim('/search', {
    format: 'json',
    addressdetails: '1',
    countrycodes: 'ar',
    limit: String(limit),
    viewbox: '-58.8,-34.4,-57.7,-35.3',
    q: query,
  })
}

export async function reversePlace(lat, lng) {
  return nominatim('/reverse', {
    format: 'json',
    addressdetails: '1',
    zoom: '18',
    lat: String(lat),
    lon: String(lng),
  })
}
