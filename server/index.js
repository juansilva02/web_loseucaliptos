import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPaymentIntent } from './payway.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const storageDir = path.join(__dirname, 'storage')
const storageFile = path.join(storageDir, 'orders.json')
const port = Number(process.env.PORT || 8787)

async function ensureStorage() {
  await mkdir(storageDir, { recursive: true })

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

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    return sendJson(response, 200, { ok: true })
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    return sendJson(response, 200, { ok: true, service: 'loseucaliptos-backend' })
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
        payment: payload.payment,
        items: payload.items || [],
        totals: {
          subtotal: getSubtotal(payload.items),
        },
        paymentProof: null,
        paymentProvider: null,
      }

      const payment = await createPaymentIntent({ order })
      const persistedOrder = { ...order, paymentProvider: payment }
      const nextOrders = [...orders, persistedOrder]

      await saveOrders(nextOrders)
      return sendJson(response, 201, { order: persistedOrder, payment })
    } catch (error) {
      return sendJson(response, 400, { message: 'No se pudo crear la orden.' })
    }
  }

  if (request.method === 'POST' && request.url?.startsWith('/api/orders/') && request.url?.endsWith('/payment-proof')) {
    try {
      const orderId = request.url.split('/')[3]
      const payload = await parseBody(request)
      const orders = await readOrders()
      const orderIndex = orders.findIndex((order) => order.id === orderId)

      if (orderIndex === -1) {
        return sendJson(response, 404, { message: 'Orden no encontrada.' })
      }

      const updatedOrder = {
        ...orders[orderIndex],
        status: 'pago_informado',
        paymentProof: {
          receiptNumber: payload.receiptNumber,
          receivedAt: new Date().toISOString(),
        },
      }

      orders[orderIndex] = updatedOrder
      await saveOrders(orders)

      return sendJson(response, 200, {
        order: {
          ...updatedOrder,
        },
        payment: updatedOrder.paymentProvider,
      })
    } catch {
      return sendJson(response, 400, { message: 'No se pudo registrar el comprobante.' })
    }
  }

  return sendJson(response, 404, { message: 'Ruta no encontrada.' })
})

server.listen(port, () => {
  console.log(`Loseucaliptos backend listening on http://127.0.0.1:${port}`)
})
