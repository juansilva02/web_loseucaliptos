import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db.js'
import { hashPassword, verifyPassword, signToken, requireAuth, requireAdmin } from '../auth.js'

const router = Router()

// Roles del sistema:
// - admin : todo, incluida la gestion de usuarios
// - editor: opera el catalogo (productos, categorias, pileta, imagenes)
const VALID_ROLES = ['admin', 'editor']

function countOtherAdmins(excludeUserId) {
  return db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND id != ?")
    .get(excludeUserId).n
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
})

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }
  const user = db.prepare('SELECT id, email, role, password_hash FROM users WHERE email = ?').get(email)
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' })
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role })
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json({ user })
})

router.get('/users', requireAdmin, (_req, res) => {
  const users = db
    .prepare('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC, id DESC')
    .all()
  res.json({ users })
})

router.post('/users', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const role = String(req.body?.role || 'editor').trim()

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Permitidos: ${VALID_ROLES.join(', ')}` })
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
  }

  const passwordHash = hashPassword(password)
  const created = db
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email, passwordHash, role)

  const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(created.lastInsertRowid)
  res.status(201).json({ user })
})

// Cambio de la PROPIA contraseña: exige conocer la actual.
// Para resetear la de otro usuario, un admin usa /users/:id/reset-password.
router.put('/users/:id/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body
  const userId = Number(req.params.id)

  if (!userId || !Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' })
  }

  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Solo puedes cambiar tu propia contraseña. Un admin puede resetear la de otros.' })
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
  }

  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' })
  }

  const newHash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId)
  res.json({ success: true })
})

// Reset de contraseña por admin: no requiere la contraseña actual.
// No aplica sobre uno mismo (para eso esta el cambio con contraseña actual).
router.put('/users/:id/reset-password', requireAdmin, (req, res) => {
  const userId = Number(req.params.id)
  const newPassword = String(req.body?.newPassword || '')

  if (!userId || !Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' })
  }

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Para tu propia contraseña usa el cambio con contraseña actual' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const newHash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId)
  res.json({ success: true })
})

// Cambio de rol: solo admin, nunca sobre uno mismo, y sin dejar al sistema
// sin administradores.
router.put('/users/:id/role', requireAdmin, (req, res) => {
  const userId = Number(req.params.id)
  const role = String(req.body?.role || '').trim()

  if (!userId || !Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' })
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Permitidos: ${VALID_ROLES.join(', ')}` })
  }

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol' })
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  if (user.role === 'admin' && role !== 'admin' && countOtherAdmins(userId) === 0) {
    return res.status(400).json({ error: 'No se puede degradar al último admin del sistema' })
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId)
  const updated = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(userId)
  res.json({ user: updated })
})

// Baja de usuario: solo admin, nunca sobre uno mismo, y sin dejar al sistema
// sin administradores.
router.delete('/users/:id', requireAdmin, (req, res) => {
  const userId = Number(req.params.id)

  if (!userId || !Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID de usuario inválido' })
  }

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' })
  }

  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  if (user.role === 'admin' && countOtherAdmins(userId) === 0) {
    return res.status(400).json({ error: 'No se puede eliminar al último admin del sistema' })
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  res.json({ success: true })
})

export default router
