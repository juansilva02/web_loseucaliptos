import { Router } from 'express'
import { db } from '../db.js'

const router = Router()
const allowedStatuses = new Set(['resolved', 'needs_clarification', 'needs_admin'])
const defaultAutomationCidrs = ['127.0.0.1/32', '::1/128', '172.28.0.0/16']

function normalizePeerAddress(address) {
  const value = String(address || '').trim().toLowerCase()
  return value.startsWith('::ffff:') ? value.slice(7) : value
}

function ipv4ToInteger(address) {
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null
  }
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0
}

function isAllowedAutomationPeer(address, cidrs = defaultAutomationCidrs) {
  const peer = normalizePeerAddress(address)
  return cidrs.some((entry) => {
    const [networkAddress, prefixText = '32'] = String(entry).trim().split('/')
    if (peer === '::1' && networkAddress === '::1' && prefixText === '128') return true

    const peerInteger = ipv4ToInteger(peer)
    const networkInteger = ipv4ToInteger(networkAddress)
    const prefix = Number(prefixText)
    if (peerInteger === null || networkInteger === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return false
    }
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    return (peerInteger & mask) === (networkInteger & mask)
  })
}

function requireInternalAutomation(req, res, next) {
  const peerAddress = normalizePeerAddress(req.socket.remoteAddress)
  const configuredCidrs = String(process.env.AUTOMATION_ALLOWED_CIDRS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const allowedCidrs = configuredCidrs.length ? configuredCidrs : defaultAutomationCidrs

  if (!isAllowedAutomationPeer(peerAddress, allowedCidrs)) {
    return res.status(403).json({ error: 'Ruta disponible solo desde la red interna' })
  }
  return next()
}

function asText(value, maxLength = 4000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizePhone(value) {
  return asText(value, 80).replace(/@c\.us$/, '')
}

function serialize(row) {
  if (!row) return null
  return {
    ...row,
    resolved: Boolean(row.resolved),
    details: JSON.parse(row.details || '{}'),
  }
}

router.use(requireInternalAutomation)

router.post('/consultations', (req, res, next) => {
  try {
    const body = req.body ?? {}
    const sessionId = asText(body.sessionId, 160)
    const chatId = asText(body.chatId, 160)
    const message = asText(body.message)
    const resolutionStatus = asText(body.resolutionStatus, 40)
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId y message son obligatorios' })
    }
    if (!allowedStatuses.has(resolutionStatus)) {
      return res.status(400).json({ error: 'resolutionStatus invalido' })
    }

    const idempotencyKey = asText(body.idempotencyKey, 255) || null
    if (idempotencyKey) {
      const existing = db.prepare(
        'SELECT * FROM whatsapp_consultations WHERE idempotency_key = ?',
      ).get(idempotencyKey)
      if (existing) return res.status(200).json({ consultation: serialize(existing), created: false })
    }

    const resolved = resolutionStatus === 'resolved' ? 1 : 0
    const details = JSON.stringify(body.details && typeof body.details === 'object' ? body.details : {})
    const result = db.prepare(`
      INSERT INTO whatsapp_consultations (
        idempotency_key, session_id, chat_id, customer_phone, customer_name,
        message, product_query, quantity, intent, resolution_status,
        resolved, response, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      idempotencyKey,
      sessionId,
      chatId,
      normalizePhone(body.customerPhone || chatId),
      asText(body.customerName, 160),
      message,
      asText(body.productQuery, 500),
      Number.isInteger(body.quantity) ? body.quantity : null,
      asText(body.intent, 80),
      resolutionStatus,
      resolved,
      asText(body.response),
      details,
    )
    const consultation = db.prepare(
      'SELECT * FROM whatsapp_consultations WHERE id = ?',
    ).get(result.lastInsertRowid)
    return res.status(201).json({ consultation: serialize(consultation), created: true })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existing = db.prepare(
        'SELECT * FROM whatsapp_consultations WHERE idempotency_key = ?',
      ).get(asText(req.body?.idempotencyKey, 255))
      if (existing) return res.status(200).json({ consultation: serialize(existing), created: false })
    }
    return next(error)
  }
})

router.get('/consultations', (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10)
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50
  const rows = db.prepare(`
    SELECT * FROM whatsapp_consultations
    ORDER BY id DESC
    LIMIT ?
  `).all(limit)
  res.json({ consultations: rows.map(serialize), count: rows.length })
})

export { isAllowedAutomationPeer }
export default router
