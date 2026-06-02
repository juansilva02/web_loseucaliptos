const TIENDANUBE_API_BASE = 'https://api.tiendanube.com/v1'
const DEFAULT_ALLOWED_POSTAL_CODES = [
  '1846',
  '1847',
  '1849',
  '1852',
  '1854',
  '1856',
  '1876',
  '1878',
  '1879',
  '1881',
  '1882',
  '1888',
  '1889',
  '1891',
]

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizePostalCode(value) {
  return String(value || '').replace(/\D/g, '')
}

function parseInteger(value, fallback) {
  const numeric = Number.parseInt(value, 10)
  return Number.isFinite(numeric) ? numeric : fallback
}

function parseFloatNumber(value, fallback) {
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function getShippingConfig() {
  return {
    storeId: process.env.TIENDANUBE_STORE_ID || '',
    accessToken: process.env.TIENDANUBE_ACCESS_TOKEN || '',
    userAgent: process.env.TIENDANUBE_USER_AGENT || 'loseucaliptos (admin@loseucaliptos.local)',
    carrierName: process.env.TIENDANUBE_CARRIER_NAME || 'Envios Los Eucaliptos',
    callbackUrl: process.env.TIENDANUBE_CALLBACK_URL || '',
    supportedTypes: process.env.TIENDANUBE_SUPPORTED_TYPES || 'ship',
    allowedPostalCodes: (
      parseList(process.env.SHIPPING_ALLOWED_POSTAL_CODES).length
        ? parseList(process.env.SHIPPING_ALLOWED_POSTAL_CODES)
        : DEFAULT_ALLOWED_POSTAL_CODES
    ).map(normalizePostalCode),
    allowedPostalPrefixes: parseList(process.env.SHIPPING_ALLOWED_POSTAL_PREFIXES).map(normalizePostalCode),
    standardRate: {
      name: process.env.SHIPPING_STANDARD_NAME || 'Envio a domicilio',
      code: process.env.SHIPPING_STANDARD_CODE || 'envio-domicilio',
      price: parseFloatNumber(process.env.SHIPPING_STANDARD_PRICE, 4500),
      currency: process.env.SHIPPING_CURRENCY || 'ARS',
      minDays: parseInteger(process.env.SHIPPING_STANDARD_MIN_DAYS, 1),
      maxDays: parseInteger(process.env.SHIPPING_STANDARD_MAX_DAYS, 2),
    },
    expressRate: {
      enabled: process.env.SHIPPING_EXPRESS_ENABLED === 'true',
      name: process.env.SHIPPING_EXPRESS_NAME || 'Envio express',
      code: process.env.SHIPPING_EXPRESS_CODE || 'envio-express',
      price: parseFloatNumber(process.env.SHIPPING_EXPRESS_PRICE, 6500),
      currency: process.env.SHIPPING_CURRENCY || 'ARS',
      minDays: parseInteger(process.env.SHIPPING_EXPRESS_MIN_DAYS, 0),
      maxDays: parseInteger(process.env.SHIPPING_EXPRESS_MAX_DAYS, 1),
    },
  }
}

export function isPostalCodeAllowed(postalCode, config = getShippingConfig()) {
  const normalized = normalizePostalCode(postalCode)
  if (!normalized) return false

  if (config.allowedPostalCodes.includes(normalized)) {
    return true
  }

  return config.allowedPostalPrefixes.some((prefix) => normalized.startsWith(prefix))
}

function isoDateAfterDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + Math.max(0, days))
  return date.toISOString()
}

function buildRate({ name, code, price, currency, minDays, maxDays }) {
  return {
    name,
    code,
    price,
    currency,
    type: 'ship',
    min_delivery_date: isoDateAfterDays(minDays),
    max_delivery_date: isoDateAfterDays(maxDays),
  }
}

export function buildAllowedShippingRates(config = getShippingConfig()) {
  const rates = [buildRate(config.standardRate)]

  if (config.expressRate.enabled) {
    rates.push(buildRate(config.expressRate))
  }

  return rates
}

export function getShippingRatesForDestination(payload, config = getShippingConfig()) {
  const postalCode = payload?.destination?.postal_code
  if (!isPostalCodeAllowed(postalCode, config)) {
    return []
  }

  return buildAllowedShippingRates(config)
}

export async function registerShippingCarrier(config = getShippingConfig()) {
  if (!config.storeId || !config.accessToken || !config.callbackUrl) {
    throw new Error(
      'Faltan TIENDANUBE_STORE_ID, TIENDANUBE_ACCESS_TOKEN o TIENDANUBE_CALLBACK_URL para registrar el carrier.',
    )
  }

  const response = await fetch(`${TIENDANUBE_API_BASE}/${config.storeId}/shipping_carriers`, {
    method: 'POST',
    headers: {
      Authentication: `bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    },
    body: JSON.stringify({
      name: config.carrierName,
      callback_url: config.callbackUrl,
      types: config.supportedTypes,
      active: true,
    }),
  })

  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    throw new Error(data?.message || `No se pudo registrar el shipping carrier. HTTP ${response.status}`)
  }

  return data
}

export async function registerShippingCarrierOption(carrierId, option, config = getShippingConfig()) {
  if (!config.storeId || !config.accessToken) {
    throw new Error('Faltan credenciales de Tiendanube para registrar opciones de envio.')
  }

  const response = await fetch(`${TIENDANUBE_API_BASE}/${config.storeId}/shipping_carriers/${carrierId}/options`, {
    method: 'POST',
    headers: {
      Authentication: `bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    },
    body: JSON.stringify({
      code: option.code,
      name: option.name,
      active: true,
    }),
  })

  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    throw new Error(data?.message || `No se pudo registrar la opcion ${option.code}. HTTP ${response.status}`)
  }

  return data
}
