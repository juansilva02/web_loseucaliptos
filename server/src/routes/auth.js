import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db.js'
import { writeAudit } from '../audit.js'
import { hashPassword, verifyPassword, signToken, requireAuth, requireAdmin } from '../auth.js'

const router = Router()
const VALID_ROLES = ['admin', 'editor']
const MIN_PASSWORD_LENGTH = 8

function countOtherAdmins(excludeUserId) {
  return db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND id != ?")
    .get(excludeUserId).n
}

function validUserId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function tokenFor(user) {
  return signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    ver: user.token_version,
  })
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
})

router.post('/login', loginLimiter, async (req, res, next) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ error: 'Email y contrasena requeridos' })

  try {
    const user = db.prepare(`
      SELECT id, email, role, password_hash, token_version
      FROM users WHERE lower(email) = ?
    `).get(email)
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email o contrasena incorrectos' })
    }
    res.json({
      token: tokenFor(user),
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json({ user })
})

router.get('/users', requireAdmin, (_req, res) => {
  const users = db.prepare(`
    SELECT id, email, role, created_at
    FROM users ORDER BY created_at DESC, id DESC
  `).all()
  res.json({ users })
})

router.post('/users', requireAdmin, async (req, res, next) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const role = String(req.body?.role || 'editor').trim()

  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' })
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    return res.status(400).json({ error: `La contrasena debe tener entre ${MIN_PASSWORD_LENGTH} y 128 caracteres` })
  }
  if (db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email)) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
  }

  try {
    const passwordHash = await hashPassword(password)
    const created = db.prepare(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    ).run(email, passwordHash, role)
    const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?')
      .get(created.lastInsertRowid)
    writeAudit({
      actor: req.user,
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      after: user,
    })
    res.status(201).json({ user })
  } catch (error) {
    next(error)
  }
})

router.put('/users/:id/password', requireAuth, async (req, res, next) => {
  const userId = validUserId(req.params.id)
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')
  if (!userId) return res.status(400).json({ error: 'ID de usuario invalido' })
  if (req.user.id !== userId) return res.status(403).json({ error: 'Solo puedes cambiar tu propia contrasena' })
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 128) {
    return res.status(400).json({ error: `La nueva contrasena debe tener entre ${MIN_PASSWORD_LENGTH} y 128 caracteres` })
  }

  try {
    const user = db.prepare(
      'SELECT id, email, role, password_hash, token_version FROM users WHERE id = ?',
    ).get(userId)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Contrasena actual incorrecta' })
    }
    const newHash = await hashPassword(newPassword)
    db.prepare(`
      UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?
    `).run(newHash, userId)
    const updated = db.prepare(
      'SELECT id, email, role, token_version FROM users WHERE id = ?',
    ).get(userId)
    writeAudit({
      actor: req.user,
      action: 'change_own_password',
      entityType: 'user',
      entityId: userId,
    })
    res.json({ success: true, token: tokenFor(updated) })
  } catch (error) {
    next(error)
  }
})

router.put('/users/:id/reset-password', requireAdmin, async (req, res, next) => {
  const userId = validUserId(req.params.id)
  const newPassword = String(req.body?.newPassword || '')
  if (!userId) return res.status(400).json({ error: 'ID de usuario invalido' })
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Para tu propia contrasena usa el cambio con contrasena actual' })
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 128) {
    return res.status(400).json({ error: `La nueva contrasena debe tener entre ${MIN_PASSWORD_LENGTH} y 128 caracteres` })
  }
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(userId)) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  try {
    const newHash = await hashPassword(newPassword)
    db.prepare(`
      UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?
    `).run(newHash, userId)
    writeAudit({
      actor: req.user,
      action: 'reset_password',
      entityType: 'user',
      entityId: userId,
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.put('/users/:id/role', requireAdmin, (req, res) => {
  const userId = validUserId(req.params.id)
  const role = String(req.body?.role || '').trim()
  if (!userId) return res.status(400).json({ error: 'ID de usuario invalido' })
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido' })
  if (req.user.id === userId) return res.status(400).json({ error: 'No puedes cambiar tu propio rol' })

  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  if (user.role === 'admin' && role !== 'admin' && countOtherAdmins(userId) === 0) {
    return res.status(400).json({ error: 'No se puede degradar al ultimo admin del sistema' })
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId)
  const updated = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(userId)
  writeAudit({
    actor: req.user,
    action: 'change_role',
    entityType: 'user',
    entityId: userId,
    before: { role: user.role },
    after: { role: updated.role },
  })
  res.json({ user: updated })
})

router.delete('/users/:id', requireAdmin, (req, res) => {
  const userId = validUserId(req.params.id)
  if (!userId) return res.status(400).json({ error: 'ID de usuario invalido' })
  if (req.user.id === userId) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' })

  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  if (user.role === 'admin' && countOtherAdmins(userId) === 0) {
    return res.status(400).json({ error: 'No se puede eliminar al ultimo admin del sistema' })
  }
  db.transaction(() => {
    writeAudit({
      actor: req.user,
      action: 'delete',
      entityType: 'user',
      entityId: userId,
      before: user,
    })
    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  })()
  res.json({ success: true })
})

export default router
