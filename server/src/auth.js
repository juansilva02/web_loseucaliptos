import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { db } from './db.js'

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET debe estar configurado en production')
  }
  console.warn('[auth] JWT_SECRET no configurado, usando fallback inseguro para desarrollo')
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h'
const SALT_LENGTH = 32
const KEY_LENGTH = 64
const scrypt = promisify(crypto.scrypt)

function base64url(buffer) {
  return buffer.toString('base64url')
}

function fromBase64url(value) {
  return Buffer.from(value, 'base64url')
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = await scrypt(password, salt, KEY_LENGTH)
  return `${salt.toString('base64url')}:${key.toString('base64url')}`
}

export async function verifyPassword(password, stored) {
  const [saltB64, keyB64] = String(stored || '').split(':')
  if (!saltB64 || !keyB64) return false
  const salt = fromBase64url(saltB64)
  const expected = fromBase64url(keyB64)
  const actual = await scrypt(password, salt, KEY_LENGTH)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

function parseDuration(duration) {
  const match = /^(\d+)([dhms])$/.exec(String(duration))
  if (!match) return 12 * 3600
  const amount = parseInt(match[1], 10)
  const multipliers = { d: 86400, h: 3600, m: 60, s: 1 }
  return amount * multipliers[match[2]]
}

export function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + parseDuration(JWT_EXPIRES) }
  const b64Header = base64url(Buffer.from(JSON.stringify(header)))
  const b64Body = base64url(Buffer.from(JSON.stringify(body)))
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${b64Header}.${b64Body}`)
    .digest()
  return `${b64Header}.${b64Body}.${base64url(signature)}`
}

export function verifyToken(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) return null
    const [b64Header, b64Body, b64Sig] = parts
    const expected = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${b64Header}.${b64Body}`)
      .digest()
    const actual = fromBase64url(b64Sig)
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null
    const body = JSON.parse(fromBase64url(b64Body).toString())
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null
    return body
  } catch {
    return null
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  const payload = verifyToken(header.slice(7))
  if (!payload) {
    return res.status(401).json({ error: 'Token invalido o expirado' })
  }
  const user = db.prepare(
    'SELECT id, email, role, token_version FROM users WHERE id = ?',
  ).get(payload.id)
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado o eliminado' })
  }
  if (!Number.isInteger(payload.ver) || payload.ver !== user.token_version) {
    return res.status(401).json({ error: 'Sesion invalidada. Ingresa nuevamente.' })
  }
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.token_version,
  }
  next()
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' })
    }
    next()
  })
}
