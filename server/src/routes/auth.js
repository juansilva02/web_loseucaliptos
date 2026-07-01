import { Router } from 'express'
import { db } from '../db.js'
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js'

const router = Router()

router.post('/login', (req, res) => {
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

router.get('/users', requireAuth, (_req, res) => {
  const users = db
    .prepare('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC, id DESC')
    .all()
  res.json({ users })
})

router.post('/users', requireAuth, (req, res) => {
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  const role = String(req.body?.role || 'admin').trim() || 'admin'

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
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

export default router
