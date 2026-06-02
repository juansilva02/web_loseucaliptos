import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getShippingConfig, getShippingRatesForDestination, isPostalCodeAllowed } from './tiendanube-shipping.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const storageDir = path.join(__dirname, 'storage')
const storageFile = path.join(storageDir, 'orders.json')
const exportDir = path.join(storageDir, 'exports')
const port = Number(process.env.PORT || 8787)

async function ensureStorage() {
  await mkdir(storageDir, { recursive: true })
  await mkdir(exportDir, { recursive: true })

  try {
    await readFile(storageFile, 'utf8')
  } catch {
    await writeFile(storageFile, '[]', 'utf8')
  }
}

async function readOrders() {
  await ensureStorage()
  const raw = await readFile(storageFile, 'utf8')
  return JSON.parse(raw || '[]')
}

async function saveOrders(orders) {
  await ensureStorage()
  await writeFile(storageFile, JSON.stringify(orders, null, 2), 'utf8')
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload))
}

async function parseBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)

  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function buildOrderId(orders) {
  const lastNumber = orders.reduce((max, order) => {
    const numeric = Number(String(order.id).replace('LE-', ''))
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, 1000)

  return `LE-${lastNumber + 1}`
}

function getSubtotal(items = []) {
  return items.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0)
}

function csvEscape(value) {
  const normalized = String(value ?? '').replaceAll('"', '""')
  return `"${normalized}"`
}

function buildExportRows(order) {
  const customerCode = order.customer?.taxId || order.customer?.code || order.customer?.phone || 'CONSUMIDOR_FINAL'
  const sellerCode = order.seller || 'WEB'
  const discountPercent = Number(order.discountPercent || 0)
  const priceListNumber = Number(order.priceListNumber || 1)
  const observations = [
    `Pedido ${order.id}`,
    `Entrega: ${order.delivery?.address || '-'}`,
    `Contacto: ${order.customer?.phone || '-'}`,
    `Canal: ${order.channel || 'whatsapp'}`,
  ].join(' | ')

  return (order.items || []).map((item) => [
    order.id,
    customerCode,
    item.code || item.id || '',
    Number(item.quantity || 0),
    sellerCode,
    '',
    '',
    discountPercent,
    priceListNumber,
    '',
    '',
    observations,
  ])
}

async function writeOrderExports(order) {
  const rows = buildExportRows(order)
  const header = [
    '01-ID pedido',
    '02-Codigo Cliente',
    '03-Codigo Articulo',
    '04-Cantidad',
    '05-Vendedor',
    '06-Sin uso',
    '07-Sin uso',
    '08-Porcentaje Descuento',
    '09-Numero de Lista de precios',
    '10-Sin uso',
    '11-Sin uso',
    '12-Observaciones',
  ]

  const csvLines = [header.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))]
  const txtLines = rows.map((row) => row.join(';'))

  const csvFilename = `${order.id}.csv`
  const txtFilename = `${order.id}.txt`

  await writeFile(path.join(exportDir, csvFilename), `${csvLines.join('\n')}\n`, 'utf8')
  await writeFile(path.join(exportDir, txtFilename), `${txtLines.join('\n')}\n`, 'utf8')

  return {
    csvFilename,
    txtFilename,
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    return sendJson(response, 200, { ok: true })
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    return sendJson(response, 200, { ok: true, service: 'loseucaliptos-backend' })
  }

  if (request.method === 'GET' && request.url === '/api/tiendanube/shipping/config') {
    const config = getShippingConfig()

    return sendJson(response, 200, {
      carrierName: config.carrierName,
      callbackUrl: config.callbackUrl,
      supportedTypes: config.supportedTypes,
      allowedPostalCodes: config.allowedPostalCodes,
      allowedPostalPrefixes: config.allowedPostalPrefixes,
      standardRate: config.standardRate,
      expressRate: config.expressRate,
    })
  }

  if (request.method === 'POST' && request.url === '/api/tiendanube/shipping/rates') {
    try {
      const payload = await parseBody(request)
      const config = getShippingConfig()
      const rates = getShippingRatesForDestination(payload, config)

      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      response.end(JSON.stringify(rates))
      return
    } catch {
      return sendJson(response, 400, { message: 'No se pudo calcular el envio para Tiendanube.' })
    }
  }

  if (request.method === 'POST' && request.url === '/api/tiendanube/shipping/validate') {
    try {
      const payload = await parseBody(request)
      const config = getShippingConfig()
      const postalCode = payload?.postal_code || payload?.destination?.postal_code || ''
      const allowed = isPostalCodeAllowed(postalCode, config)

      return sendJson(response, 200, {
        postalCode,
        allowed,
        rates: allowed ? getShippingRatesForDestination({ destination: { postal_code: postalCode } }, config) : [],
      })
    } catch {
      return sendJson(response, 400, { message: 'No se pudo validar el codigo postal.' })
    }
  }

  if (request.method === 'POST' && request.url === '/api/orders') {
    try {
      const payload = await parseBody(request)
      const orders = await readOrders()

      const order = {
        id: buildOrderId(orders),
        createdAt: new Date().toISOString(),
        status: 'pendiente_revision',
        customer: payload.customer,
        delivery: payload.delivery,
        channel: payload.channel || 'whatsapp',
        seller: payload.seller || 'WEB',
        discountPercent: payload.discountPercent || 0,
        priceListNumber: payload.priceListNumber || 1,
        items: payload.items || [],
        totals: {
          subtotal: getSubtotal(payload.items),
        },
      }

      const exports = await writeOrderExports(order)
      const persistedOrder = { ...order, exports }
      const nextOrders = [...orders, persistedOrder]

      await saveOrders(nextOrders)
      return sendJson(response, 201, { order: persistedOrder, exports })
    } catch (error) {
      return sendJson(response, 400, { message: 'No se pudo crear la orden.' })
    }
  }

  return sendJson(response, 404, { message: 'Ruta no encontrada.' })
})

server.listen(port, () => {
  console.log(`Loseucaliptos backend listening on http://127.0.0.1:${port}`)
})
